import set from "lodash/set";
import vouivre from "./vouivre";

var directives = {
	"foreach-*": {
		priority: 100,
		extra: {
			createInstance(templateEl, scopeName, array, context) {
				const instance = templateEl.content.cloneNode(true).firstElementChild;
				instance.setAttribute(`${vouivre.prefix}-scope`, "");
				instance.__scopeName = scopeName;
				instance.__array = array;
				instance.__context = context;
				return instance;
			},
		},
		bind(templateEl, items) {
			// if moveBefore is available use it, fallback to insertBefore
			this.moveBeforeAvailable = typeof templateEl.moveBefore === "function";
			this.instances = new Map();
			this.watch([...this._path, "length"]);
		},
		update(templateEl, items) {
			var instances = this.instances;
			if (!items) return;

			for (let i = items.length - 1; i >= 0; i--) {
				let next = templateEl;
				for (let nextIndex = i + 1; nextIndex < items.length; nextIndex++) {
					if (instances.has(items[nextIndex])) {
						next = instances.get(items[nextIndex]);
						break;
					}
				}
				const item = items[i];
				if (!item) {
					console.warn("undefined item in array");
					continue;
				}
				var instance = instances.get(item);

				if (!instance) {
					instance = this.extra.createInstance(templateEl, this.args[0], items, item);
					templateEl.parentElement.insertBefore(instance, next);
					instances.set(item, instance);
					vouivre.bindNode(instance, this.model);
				} else if (next && instance.nextSibling != next) {
					if (this.moveBeforeAvailable) {
						templateEl.parentElement.moveBefore(instance, next);
					} else {
						templateEl.parentElement.insertBefore(instance, next);
					}
				}
			}

			instances.forEach((instance) => {
				if (!items.some((i) => i == instance.__context)) {
					instance.remove();
					instances.delete(instance.__context);
					vouivre.unbindNode(instance);
				}
			});
		},
	},
	value: {
		priority: 50,
		update: function (el, value) {
			el.value = value;
		},
	},
	bind: {
		priority: 45,
		extra: {
			getControlType(el) {
				if (el.tagName === "SELECT") return "select";
				if (el.tagName === "INPUT") {
					if (el.type === "checkbox") return "checkbox";
					if (el.type === "radio") return "radio";
				}
				return "value";
			},
			hasValue(target, key) {
				if (target instanceof Set) return target.has(key);
				if (Array.isArray(target)) return target.includes(key);
				if (typeof target === "object") return key in target;
				return target == key;
			},
			writeArray(target, array) {
				if (target instanceof Set) return this.setValue(new Set(array));
				if (Array.isArray(target)) return this.setValue(array);
				if (typeof target === "object") return this.setValue(array.reduce((ac, k) => ({ ...ac, [k]: true }), {}));
				return this.setValue(array[0]);
			},
		},
		bind: function (el, v) {
			this.watch([...this._path, "*"]);
			this.controlType = this.extra.getControlType(el);
			const eventName = this.controlType === "value" ? "input" : "change";

			el.addEventListener(eventName, (e) => {
				// get the current value again because ref may have changed since bind was called
				const value = this.getValue();
				switch (this.controlType) {
					case "value":
						return this.setValue(el.value);
					case "select":
						const selected = Array.from(el.selectedOptions).map((opt) => opt.value);
						this.extra.writeArray(value, selected);
						break;
					default:
						let checked = Array.from(document.getElementsByName(el.name))
							.filter((i) => i.checked)
							.map((i) => i.value);
						this.extra.writeArray(value, checked);
						break;
				}
			});
		},
		update: function (el, value) {
			switch (this.controlType) {
				case "value":
					el.value = value;
					break;
				case "select":
					for (const opt of Array.from(el.options)) {
						opt.selected = this.extra.hasValue(value, opt.value);
					}
					break;
				default:
					el.checked = this.extra.hasValue(value, el.value);
					break;
			}
		},
	},
	text: {
		update: function (el, value) {
			el.innerText = value;
		},
	},
	show: {
		update: function (el, value) {
			el.style.display = value ? "" : "none";
		},
	},
	enabled: {
		update: function (el, value) {
			el.disabled = !value;
		},
	},
	"on-*": {
		bind: function (el, value) {
			el.addEventListener(this.args[0], (e) => value(e, this.getScopeValues(), ...this.fnArgs));
		},
	},
	"class-*": {
		update: function (el, value) {
			el.classList.toggle(this.args.join("-"), value);
		},
	},
	if: {
		update(el, value) {
			if (value && !this.instance) {
				let instance = el.content.cloneNode(true).firstElementChild;
				el.insertAdjacentElement("beforebegin", instance);
				this.instance = instance;
				vouivre.bindNode(instance, this.model);
			} else if (!value && this.instance) {
				this.instance.remove();
				vouivre.unbindNode(this.instance);
				this.instance = undefined;
			}
		},
	},
	"attr-*": {
		update: function (el, value) {
			el.toggleAttribute(this.args.join("-"), value);
		},
	},
	"prop-*": {
		update: function (el, value) {
			set(el, this.args, value);
		},
	},
	"*": {
		priority: 0,
		update: function (el, value) {
			el.setAttribute(this.args.join("-"), value);
		},
	},
};

export default directives;
