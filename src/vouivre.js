import { createModel } from "./model";

// function setupHighlightRefresh() {
// 	const sheet = new CSSStyleSheet();
// 	for (let i = 0; i < 10; i++) {
// 		let value = 25 + 25 * i;
// 		sheet.insertRule(`.refresh-${i} { background-color: rgb(${value}, 25, 25); }`, 0);
// 	}
// 	document.adoptedStyleSheets.push(sheet);
// }

// export function highlightRefresh(element) {
// 	const PREFIX = "refresh-";
// 	const MAX = 9;
// 	const DURATION = 2000;

// 	const currentClass = [...element.classList].find((c) => c.startsWith(PREFIX));
// 	let nextClass;

// 	if (currentClass) {
// 		const level = Math.min(parseInt(currentClass.replace(PREFIX, "")) + 1, MAX);
// 		nextClass = `${PREFIX}${level}`;
// 		element.classList.replace(currentClass, nextClass);
// 	} else {
// 		nextClass = `${PREFIX}0`;
// 		element.classList.add(nextClass);
// 	}

// 	setTimeout(() => {
// 		element.classList.contains(nextClass) && element.classList.remove(nextClass);
// 	}, DURATION);
// }

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
		// if (vouivre.debug) highlightRefresh(context);
	},
	bind(context, data, options = {}) {
		// vouivre.debug = options.debug ?? false;
		// if (options.debug) {
		// 	setupHighlightRefresh();
		// }

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
