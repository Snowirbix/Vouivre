import set from "lodash/set";
import Service from "./service";
import vouivre from "./vouivre";

var services = [];
services.push(
	new Service("foreach-*", {
		bind(templateEl, items) {
			// if moveBefore is available use it, fallback to insertBefore
			this.moveBeforeAvailable = typeof templateEl.moveBefore === "function";
			this.instances = new Map();
			this.watch([...this._path, "length"]);

			this.createInstance = (scopeName, array, context) => {
				const instance = templateEl.content.cloneNode(true).firstElementChild;
				instance.setAttribute(`${vouivre.prefix}-scope`, "");
				instance.__scopeName = scopeName;
				instance.__array = array;
				instance.__context = context;
				return instance;
			};
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
					instance = this.createInstance(this.args[0], items, item);
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
	}),
);

services.push(
	new Service("value", {
		update: function (el, value) {
			el.value = value;
		},
	}),
);
services.push(
	new Service("bind", {
		bind: function (el, v) {
			this.watch([...this._path, "*"]);

			function getControlType(el) {
				if (el.tagName === "SELECT") return "select";
				if (el.tagName === "INPUT") {
					if (el.type === "checkbox") return "checkbox";
					if (el.type === "radio") return "radio";
				}
				return "value";
			}
			this.controlType = getControlType(el);
			const eventName = this.controlType === "value" ? "input" : "change";

			this.hasValue = (target, key) => {
				if (target instanceof Set) return target.has(key);
				if (Array.isArray(target)) return target.includes(key);
				if (typeof target === "object") return key in target;
				return target == key;
			};
			this.writeArray = (target, array) => {
				if (target instanceof Set) return this.setValue(new Set(array));
				if (Array.isArray(target)) return this.setValue(array);
				if (typeof target === "object") return this.setValue(array.reduce((ac, k) => ({ ...ac, [k]: true }), {}));
				return this.setValue(array[0]);
			};

			el.addEventListener(eventName, (e) => {
				// get the current value again because ref may have changed since bind was called
				const value = this.getValue();
				switch (this.controlType) {
					case "value":
						return this.setValue(el.value);
					case "select":
						const selected = Array.from(el.selectedOptions).map((opt) => opt.value);
						this.writeArray(value, selected);
						break;
					default:
						let checked = Array.from(document.getElementsByName(el.name))
							.filter((i) => i.checked)
							.map((i) => i.value);
						this.writeArray(value, checked);
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
						opt.selected = this.hasValue(value, opt.value);
					}
					break;
				default:
					el.checked = this.hasValue(value, el.value);
					break;
			}
		},
	}),
);
services.push(
	new Service("text", {
		update: function (el, value) {
			el.innerText = value;
		},
	}),
);
services.push(
	new Service("show", {
		update: function (el, value) {
			el.style.display = value ? "" : "none";
		},
	}),
);
services.push(
	new Service("enabled", {
		update: function (el, value) {
			el.disabled = !value;
		},
	}),
);

services.push(
	new Service("on-*", {
		bind: function (el, value) {
			el.addEventListener(this.args[0], (e) => value(e, this.getScopeValues(), ...this.fnArgs));
		},
	}),
);
services.push(
	new Service("class-*", {
		update: function (el, value) {
			el.classList.toggle(this.args.join("-"), value);
		},
	}),
);

services.push(
	new Service("if", {
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
	}),
);

services.push(
	new Service("attr-*", {
		update: function (el, value) {
			el.toggleAttribute(this.args.join("-"), value);
		},
	}),
);
services.push(
	new Service("prop-*", {
		update: function (el, value) {
			set(el, this.args, value);
		},
	}),
);

export default services;
