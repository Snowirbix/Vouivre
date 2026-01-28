import Service from "./service";
import InterpolationService from "./interpolation";
import vouivre from "./vouivre";

var services = [];
services.push(
	new Service("value", {
		bind: function (el, value) {
			el.addEventListener("input", (e) => {
				this.setValue(el.value);
			});
		},
		update: function (el, value) {
			el.value = value;
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
			el.addEventListener(this.args[0], (e) => value(e, this.getScopeValues()));
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

services.push(new InterpolationService());

services.push(
	new Service("if", {
		update(el, value) {
			if (value && !this.instance) {
				let instance = el.content.cloneNode(true).firstElementChild;
				el.insertAdjacentElement("beforebegin", instance);
				this.instance = instance;
			} else if (!value && this.instance) {
				this.instance.remove();
				this.instance = undefined;
			}
		},
	}),
);
services.push(
	new Service("foreach-*", {
		bind(templateEl, items) {
			this.instances = [];
			this.watch([...this._path, "length"]);

			this.findInstance = (value) => this.instances.find((i) => i.__context === value);

			this.createInstance = (scopeName, array, context) => {
				const instance = templateEl.content.cloneNode(true).firstElementChild;
				instance.setAttribute(`${vouivre.prefix}-scope`, "");
				instance.__scopeName = scopeName;
				instance.__array = array;
				instance.__context = context;
				return instance;
			};

			this.insertInstance = (anchor, instance, previous, next) => {
				const parent = anchor.parentElement;

				if (previous) {
					parent.insertBefore(instance, previous.nextSibling);
				} else if (next) {
					parent.insertBefore(instance, next);
				} else {
					parent.insertBefore(instance, anchor);
				}
			};
		},
		update(templateEl, items) {
			var instances = this.instances;
			if (!items) return;
			for (let i = 0; i < items.length; i++) {
				const item = items[i];
				if (!item) {
					console.warning("undefined item");
					continue;
				}
				var instance = this.findInstance(item);

				if (!instance) {
					instance = this.createInstance(this.args[0], items, item);

					const previous = items[i - 1] && this.findInstance(items[i - 1]);
					const next = items[i + 1] && this.findInstance(items[i + 1]);

					this.insertInstance(templateEl, instance, previous, next);
					instances.push(instance);
				}
			}
			for (let i = instances.length - 1; i >= 0; i--) {
				let instance = instances[i];
				if (!items.some((i) => i == instance.__context)) {
					instance.remove();
					instances.splice(i, 1);
				}
			}
		},
	}),
);

export default services;
