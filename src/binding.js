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

class BindingModifier {
	binding;
	modifier;
	args;
	watchlist;

	constructor(binding, modifierName, args) {
		this.binding = binding;
		this.modifier = vouivre.modifiers.find((mod) => mod.name == modifierName);
		this.args = args.map((arg) => ({
			path: arg,
			type: binding.getPathType(arg),
		}));
	}

	watchArgs() {
		this.args.filter((arg) => arg.type != "primitive").forEach((arg) => this.binding.watch(arg.path));
	}

	#resolveArgs() {
		return this.args.map((arg) => this.binding.getPathValue(arg.type, arg.path));
	}

	setup() {
		this.modifier.setup(this.binding, ...this.#resolveArgs());
	}

	read(value) {
		return this.modifier.read(this.binding, value, ...this.#resolveArgs());
	}

	write(value) {
		return this.modifier.write(this.binding, value, ...this.#resolveArgs());
	}
}

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

	modifiers;
	model;
	watchlist = [];

	constructor(element, service, expression, args, model) {
		this.element = element;
		this.service = service;
		this.expression = expression;
		this.args = args;
		this.model = model;

		this.#getScopeElements();
		let { path, modifiers } = this.#processBindingExpression(expression);
		this.path = path;
		this._path = toPath(path);
		this.type = this.getPathType(this._path);

		this.modifiers = modifiers;
		for (let modifier of this.modifiers) {
			modifier.watchArgs(this);
			modifier.setup(this);
		}

		const [dependency, prop] = this.getPathDependency(this.type, this._path);
		this.context = dependency;
		this.prop = prop;
		this.watch(this._path);

		this.listener = this.#handleUpdate.bind(this);
		this.model.__event.addEventListener("requestUpdate", this.listener);

		if (!this.element.__bindings) {
			this.element.__bindings = [];
		}
		this.element.__bindings.push(this);
	}

	unbind() {
		this.model.__event.removeEventListener("requestUpdate", this.listener);
		this.watchlist.length = 0;
	}

	#handleUpdate(event) {
		const { target, key } = event.detail;
		const staleWatches = new Set();
		let accepted = false;

		for (const watch of this.watchlist) {
			const result = this.#isWatchAffected(watch, target, key);

			if (!result.affected) continue;

			accepted = true;
			if (result.stale) {
				staleWatches.add(watch);
			}
		}

		if (staleWatches.size > 0) {
			this.watchlist = this.watchlist.filter((w) => !staleWatches.has(w));
			for (const watch of staleWatches) {
				this.watch(watch._path);
			}
		}

		if (accepted) this.service.update(this);
	}

	#processBindingExpression(expr) {
		let [path, ...modifierExprs] = expr.split(":");
		path = path.trim();
		const modifiers = modifierExprs.map((expr) => {
			let [modifierName, ...modifierArgs] = expr.trim().split(/\s+/);
			return new BindingModifier(this, modifierName, modifierArgs);
		});
		return { path, modifiers };
	}

	#isWatchAffected(watch, target, key) {
		if (watch.dependency === target && watch.prop === key) {
			return { affected: true, stale: false };
		}

		// check parent object change
		let node = watch.dependency;
		let parent = this.model.__lookup.get(node);
		while ((parent = this.model.__lookup.get(node))) {
			// trigger only when object ref changes
			if (parent === target && node === target[key]) {
				return { affected: true, stale: true };
			}
			node = parent;
		}

		if (watch.wildcard) {
			let node = target;
			do {
				// trigger if update is on a descendant of dependency
				if (node == watch.dependency) {
					return { affected: true, stale: false };
				}
			} while ((node = this.model.__lookup.get(node)));
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

	getPathType(path) {
		const _path = toPath(path);
		if (_path.at(-1) == "$index") {
			_path.pop();
			console.assert(_path.every((p) => p == "$parent"));
			return "$index";
		}
		if (_path[0] in this.model) {
			return "model";
		}
		if (this.scopeElements.some((scopeEl) => scopeEl.__scopeName == _path[0])) {
			return "scope";
		}
		return "primitive";
	}

	getPathValue(type, path) {
		const _path = toPath(path);
		switch (type) {
			case "$index": {
				// all array elements but the last one are $parent
				const el = this.scopeElements[_path.length - 1];
				return el.__array.findIndex((v) => v == el.__context);
			}
			case "model":
				return get(this.model, _path);
			case "scope": {
				const name = _path.shift();
				const el = this.scopeElements.find((s) => s.__scopeName == name);
				return _path.length > 0 ? get(el.__context, _path) : el.__context;
			}
			case "primitive":
			default:
				return path;
		}
	}

	getPathDependency(type, path) {
		const _path = toPath(path);
		switch (type) {
			case "$index": {
				const el = this.scopeElements[_path.length - 1];
				return [el.__array, "length"];
			}
			case "model": {
				const prop = _path.pop();
				const dep = _path.length > 0 ? get(this.model, _path) : this.model;
				return [dep, prop];
			}
			case "scope": {
				const name = _path.shift();
				const el = this.scopeElements.find((s) => s.__scopeName == name);
				if (_path.length == 0) {
					// primitive array
					return [el.__array, el.__array.indexOf(el.__context).toString()];
				}
				const prop = _path.pop();
				const dep = _path.length > 0 ? get(el.__context, _path) : el.__context;
				return [dep, prop];
			}
			case "primitive":
			default:
				return null;
		}
	}

	watch(path) {
		const _path = toPath(path);
		const watch = {
			_path,
		};
		if (_path.at(-1) == "*") {
			watch.wildcard = true;
			_path.pop();
		}

		const type = this.getPathType(_path);
		const [dependency, prop] = this.getPathDependency(type, _path);
		watch.dependency = dependency;
		watch.prop = prop;

		if (type == "model") {
			let desc = Object.getOwnPropertyDescriptor(dependency, prop);
			if (desc && desc.get && typeof desc.get == "function") {
				watch.computedProp = true;
				let dependencies = watch.dependency[prop + "_dependencies"] ?? [];
				for (let dep of dependencies) {
					this.watch(dep);
				}
			}
		}

		this.watchlist.push(watch);
	}

	getValue() {
		let value = this.getPathValue(this.type, this._path);
		value = this.modifiers.reduce((acc, modifier) => modifier.read(acc), value);
		this.cachedValue = value;
		return value;
	}

	setValue(value) {
		set(this.context, this.prop, value);
	}
}
