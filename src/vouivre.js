import { createModel } from "./model";

function setupHighlightRefresh() {
	const sheet = new CSSStyleSheet();
	for (let i = 0; i < 10; i++) {
		let value = 230 - 25 * i;
		sheet.insertRule(`.refresh-${i} { background-color: rgb(255, ${value}, ${value}); }`, 0);
	}
	document.adoptedStyleSheets.push(sheet);
}

export function highlightRefresh(element) {
	const PREFIX = "refresh-";
	const MAX = 9;
	const DURATION = 3000;

	const currentClass = [...element.classList].find((c) => c.startsWith(PREFIX));
	let nextClass;

	if (currentClass) {
		const level = Math.min(parseInt(currentClass.replace(PREFIX, "")) + 1, MAX);
		nextClass = `${PREFIX}${level}`;
		element.classList.replace(currentClass, nextClass);
	} else {
		nextClass = `${PREFIX}0`;
		element.classList.add(nextClass);
	}

	setTimeout(() => {
		element.classList.contains(nextClass) && element.classList.remove(nextClass);
	}, DURATION);
}

function onMutation(mutations, obs, model, event, lookup) {
	for (const mutation of mutations) {
		if (mutation.type === "childList") {
			for (const addedNode of mutation.addedNodes) {
				if (addedNode.nodeType == Node.ELEMENT_NODE) {
					for (let service of vouivre.services) {
						service.run(addedNode, model, event, lookup);
					}
				}
			}
			for (const removedNodes of mutation.removedNodes) {
				for (let service of vouivre.services) {
					service.clear(removedNodes);
				}
			}
		} else if (
			mutation.type === "attributes" &&
			mutation.attributeName.startsWith(`${vouivre.prefix}-`) &&
			mutation.attributeName !== `${vouivre.prefix}-scope`
		) {
			// console.log(`The ${mutation.attributeName} attribute was modified.`);
		}
	}
}
function observe(context, model, event, lookup) {
	let observer = new MutationObserver((mutations, obs) => onMutation(mutations, obs, model, event, lookup));
	observer.observe(context, { attributes: true, childList: true, subtree: true });
	return observer;
}

var vouivre = {
	services: {},
	modifiers: {},
	prefix: "v",
	debug: false,
	bind(context, data, debug = false) {
		vouivre.debug = debug;
		if (debug) {
			setupHighlightRefresh();
		}
		let { model, event, lookup } = createModel(data);
		let observer = observe(context, model, event, lookup);
		for (let service of vouivre.services) {
			service.run(context, model, event, lookup);
		}
		return [model, observer];
	},
	unbind(context, observer) {
		observer.disconnect();
		for (let service of vouivre.services) {
			service.clear(context);
		}
	},
};
export default vouivre;
