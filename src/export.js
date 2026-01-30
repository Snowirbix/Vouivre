import vouivre from "./vouivre";
import services from "./services";
import modifiers from "./modifiers";
import InterpolationService from "./interpolation";
import Service from "./service";
export { default as Service } from "./service";
export { default as Modifier } from "./modifier";

vouivre.services = services;
vouivre.defaultService = new Service("*", {
	update: function (el, value) {
		el.setAttribute(this.args.join("-"), value);
	},
});
vouivre.interpolationService = new InterpolationService();
vouivre.modifiers = modifiers;

export default vouivre;
