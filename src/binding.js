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
	fnArgs = [];
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
		this.event = event;
		this.lookup = lookup;

		let { path, modifierName, modifierArgs } = this.#processBindingExpression(expression);
		this.path = path;
		this._path = toPath(path);
		this.#getScopeElements();

		this.modifier = vouivre.modifiers.find(({ name }) => name === modifierName);
		this.modifierArgs = modifierArgs;
		if (this.modifier) {
			this.#watchModifierArgs();
			this.modifier.setup(this, ...this.#resolveModifierArgs());
		}

		let { dependency, _path } = this.watch(this._path);
		this.context = dependency;
		this._path = _path;

		this.listener = this.#handleUpdate.bind(this);
		event.addEventListener("requestUpdate", this.listener);

		if (!this.element.__bindings) {
			this.element.__bindings = [];
		}
		this.element.__bindings.push(this);
	}

	unbind() {
		this.event.removeEventListener("requestUpdate", this.listener);
		this.watchlist.length = 0;
	}

	#handleUpdate(event) {
		const { target, key } = event.detail;
		const staleWatches = new Set();
		let accepted = false;

		for (const watch of this.watchlist) {
			const result = this.#isWatchAffected(watch, target, key, this.lookup);

			if (!result.affected) continue;

			accepted = true;
			if (result.stale) {
				staleWatches.add(watch);
			}
		}

		if (staleWatches.size > 0) {
			this.watchlist = this.watchlist.filter((w) => !staleWatches.has(w));
			for (const watch of staleWatches) {
				const _path = watch.wildcard ? [...watch._path, "*"] : watch._path;
				this.watch(_path);
			}
		}

		if (accepted) this.service.update(this);
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
		if (watch.dependency === target && watch._path.at(-1) === key) {
			return { affected: true, stale: false };
		}

		// check parent object change
		let node = watch.dependency;
		let pathIndex = watch._path.length - 2;

		while ((node = parentLookup.get(node))) {
			// trigger only when object ref changes
			if (node === target && watch._path[pathIndex] === key) {
				return { affected: true, stale: true };
			}
			pathIndex--;
		}

		if (watch.wildcard) {
			let node = target;
			do {
				// trigger if update is on a descendant of dependency
				if (node == watch.dependency) {
					return { affected: true, stale: false };
				}
			} while ((node = parentLookup.get(node)));
		}

		return { affected: false };
	}

	#getScopeElements() {
		this.scopeElements = this.element.parents(`*[${vouivre.prefix}-scope]`);
	}

	#watchModifierArgs() {
		for (let arg of this.modifierArgs) {
			if (arg.startsWith("$")) {
				this.watch(arg);
			}
			if (arg.startsWith("@")) {
				this.watch(arg.substring(1));
			}
		}
	}

	#resolveModifierArgs() {
		return this.modifierArgs.map((arg) => {
			if (arg.startsWith("$")) {
				return this.getValueFrom(arg);
			}
			if (arg.startsWith("@")) {
				return this.getValueFrom(arg.substring(1));
			}
			return arg;
		});
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
		path.pop(); // pop the property name, we only want the dependency object ref
		for (let scopeEl of this.scopeElements) {
			if (path[0] == scopeEl.__scopeName) {
				path.shift(); // shift the scope name
				return path.length ? get(scopeEl.__context, path) : scopeEl.__context;
			}
		}
		return undefined;
	}

	watch(originalPath) {
		if (!(originalPath instanceof Array)) {
			originalPath = toPath(originalPath);
		} else {
			originalPath = [...originalPath];
		}
		const watch = {};

		if (originalPath.at(-1) == "*") {
			watch.wildcard = true;
			originalPath.pop();
		}

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
				watch.dependency = scopeEl.__array;
				watch._path = [...originalPath, "length"];
				this.watchlist.push(watch);
				return { dependency: undefined, _path: originalPath };
			}
		}
		if (root in this.model) {
			watch.dependency = this.#resolveFromModel(path);
			watch._path = originalPath;
		} else {
			// primitive array
			if (path.length == 1) {
				for (let scopeEl of this.scopeElements) {
					if (root == scopeEl.__scopeName) {
						watch.dependency = scopeEl.__array;
						watch._path = [scopeEl.__array.indexOf(scopeEl.__context).toString()];
						break;
					}
				}
				if (!watch.dependency) {
					console.warn(`could not find match for path ${originalPath.join(".")}`);
				}
			} else {
				// didn't resolve the fullpath from scopes for the watch path thing
				// but if the scope is stale this child element will be removed anyway
				watch.dependency = this.#resolveFromScopes(path);
				if (!watch.dependency) {
					console.warn(`could not find match for path ${originalPath.join(".")}`);
				}
				watch._path = originalPath;
			}
		}

		if (watch.dependency && watch._path) {
			let desc = Object.getOwnPropertyDescriptor(watch.dependency, watch._path.at(-1));
			if (desc.get && typeof desc.get == "function") {
				let dependencies = watch.dependency[watch._path.at(-1) + "_dependencies"];
				if (dependencies && Array.isArray(dependencies)) {
					for (let dependency of dependencies) {
						this.watch(dependency);
					}
				}
			}
		}

		this.watchlist.push(watch);
		return watch;
	}

	getValueFrom(path) {
		let _path = toPath(path);
		if (_path[0] in this.model) {
			return get(this.model, _path);
		}
		return get(this.getScopeValues(), _path);
	}

	getValue() {
		let value;
		if (this._path.at(-1).startsWith("$")) {
			value = get(this.getScopeValues(), this._path);
		} else {
			value = get(this.context, this._path.at(-1));
			if (this.modifier) {
				value = this.modifier.read(this, value, ...this.#resolveModifierArgs());
			}
		}
		this.cachedValue = value;
		return value;
	}

	setValue(value) {
		set(this.context, this._path.at(-1), value);
	}
}
