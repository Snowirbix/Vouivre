import vouivre from "./vouivre";
import directives from "./directives";
import modifiers from "./modifiers";
import InterpolationDirective from "./interpolation";
import Directive from "./directive";
import Modifier from "./modifier";

vouivre.directives = directives;
vouivre.defaultDirective = new Directive("*", {
	update: function (el, value) {
		el.setAttribute(this.args.join("-"), value);
	},
});
vouivre.interpolationDirective = new InterpolationDirective();
vouivre.modifiers = modifiers;
vouivre.directive = function (name, callbacks) {
	vouivre.directives.push(new Directive(name, callbacks));
};
vouivre.modifier = function (name, callbacks) {
	vouivre.modifiers.push(new Modifier(name, callbacks));
};

export default vouivre;
