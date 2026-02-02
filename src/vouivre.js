import { createModel } from "./model";

var vouivre = {
	directives: {},
	defaultDirective: undefined,
	interpolationDirective: undefined,
	modifiers: {},
	prefix: "v",
	debug: false,
	xpath() {
		return `.//descendant-or-self::*[@*[starts-with(name(), '${vouivre.prefix}-')]]`;
	},
	scan(context) {
		const result = document.evaluate(vouivre.xpath(), context, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);

		let elements = [];
		for (let i = 0; i < result.snapshotLength; i++) {
			elements.push(result.snapshotItem(i));
		}
		return elements;
	},
	bindNode(context, model) {
		let elements = vouivre.scan(context);
		for (let directive of vouivre.directives) {
			directive.bind(elements, model);
		}
		vouivre.defaultDirective.bind(elements, model);
		vouivre.interpolationDirective.bind(context, model);
	},
	bind(context, data, options = {}) {
		let model = createModel(data);
		vouivre.bindNode(context, model);

		return model;
	},
	unbindNode(context) {
		for (let directive of vouivre.directives) {
			directive.unbind(context);
		}
		vouivre.defaultDirective.unbind(context);
		vouivre.interpolationDirective.unbind(context);
	},
	unbind(context) {
		for (let directive of vouivre.directives) {
			directive.unbind(context);
		}
	},
};
export default vouivre;
