import vouivre from "./vouivre";
import directives from "./directives";
import modifiers from "./modifiers";
import InterpolationDirective from "./interpolation";
import Directive from "./directive";
export { default as Directive } from "./directive";
export { default as Modifier } from "./modifier";

vouivre.directives = directives;
vouivre.defaultDirective = new Directive("*", {
	update: function (el, value) {
		el.setAttribute(this.args.join("-"), value);
	},
});
vouivre.interpolationDirective = new InterpolationDirective();
vouivre.modifiers = modifiers;

export default vouivre;
