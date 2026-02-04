import { createModel } from "./model";

var vouivre = {
	bindDirectives: undefined,
	unbindDirectives: undefined,
	directives: {},
	interpolation: undefined,
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
		vouivre.bindDirectives(elements, model);
		vouivre.interpolation.bind(context, model);
	},
	bind(context, data, options = {}) {
		let model = createModel(data);
		vouivre.bindNode(context, model);

		return model;
	},
	unbindNode(context) {
		vouivre.unbindDirectives(context);
		vouivre.interpolation.unbind(context);
	},
	unbind(context) {
		vouivre.unbindNode(context);
	},
};
export default vouivre;
