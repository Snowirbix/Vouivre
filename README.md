# Vouivre

Vouivre is a lightweight reactive library with easy templating syntax and powerful data binding to enhance your html views.

## Usage

```html
<input type="text" v-value="name" />
<button v-on-click="addPerson">Add</button>
<ol>
    <template v-foreach-person="persons">
        <li>
            <div>{ $index }- { person.name }</div>
            <button v-on-click="remove">Remove</button>
        </li>
    </template>
</ol>
```

```js
const [model, observer] = vouivre.bind(document.body, {
	name: "",
	persons: [
		{
			name: "Nawel",
		},
		{
			name: "Kira",
		},
	],
	addPerson(e) {
		e.preventDefault();
		model.persons.push({ name: model.name });
	},
	remove(e, scope) {
		model.persons.splice(scope.$index, 1);
	},
});

```

## Modifiers

```html
<div v-show="isPrivate : not">public</div>
<div v-text="currentTime : time"></div>
```

```js
vouivre.bind(document.body, { isPrivate: true, currentTime: Date.now() });
```
