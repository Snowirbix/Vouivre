# Vouivre

Vouivre is a lightweight reactive library with easy templating syntax and powerful data binding to enhance your html views.

## Installation

You can install Vouivre using the package manager
```
npm install vouivre
```
and import in your project using a bundler like webpack or vite
```javascript
import vouivre from "vouivre"
```

## Usage

### Template syntax

The templating syntax allows you to bind your HTML DOM elements to an object of data in javascript. The template uses different attributes prefixed with `v-` or text wrapped in brackets `{ ... }` (aka text interpolation).  

```html
<article>
	<address>
		<a rel="author" v-href="author.link">{ author.firstName } { author.lastName }</a>
	</address>
</article>
```

```js
vouivre.bind(document.body, {
	author: {
		firstName: "John",
		lastName: "Doe",
		link: "/authors/john-doe/"
	}
});
```
Vouivre binds HTML elements to the model's property and observes modifications using a Proxy. When a property is modified in the model, only the corresponding bindings are updated, ensuring minimal DOM manipulations and maximum performance.

### Listening to Events

The `on` directive is used to bind event to an element.

```html
<main>
	<button v-on-click="addOne"></button>
	<span>{ count }</span>
</main>
```

```js
const model = vouivre.bind(document.body, {
	count: 0,
	addOne() {
		model.count++;
	}
});
```

### Iterating with foreach

The `foreach` directive is a special one, creating a scope for each iterated item. The name of the scope variable is the parameter of the directive just after `v-foreach-`. Children elements can access this bound variable as well as a special variable `$index`.

```html
<ol>
	<template v-foreach-person="persons">
		<li>
			<div>{ $index }</div>
			<div>{ person.name }</div>
			<button v-on-click="remove">Remove<button>
		</li>
	</template>
</ol>
```

Foreach supports all array operations, from adding and removing items to reordering the whole array. Moving elements in the array will just move HTML elements to match the new order with [moveBefore](https://developer.mozilla.org/en-US/docs/Web/API/Element/moveBefore), keeping the state of the node.

```js
const model = vouivre.bind(document.body, {
	persons: [
		{
			name: "Kira"
		},
		{
			name: "Wellan"
		}
	],
	remove(event, scope) {
		persons.splice(scope.$index, 1);
	}
});
```
Event listener receive a scope object as a second argument, with all the scoped values and $index above the node.

### Binding inputs

The `binding` directive allows you to create a bidirectional bind between the model value and an input element. This means that the model is updated when the user interacts with the form inputs, and the inputs are updated if the model is modified.

```html
<form>
	<input type="text" v-bind="author.firstName" />
	<input type="number" v-bind="author.age" />
	<!-- Select with array of options -->
	<select v-bind="selectedOptions" multiple size="3">
		<template v-foreach-option="options">
			<option v-value="option">{ option }</option>
		</template>
	</select>
	<!-- Checkboxes with array of options -->
	<template v-foreach-option="options">
		<div class="control">
			<input v-id="option" type="checkbox" name="pays" v-bind="selectedOptions" v-value="option" />
			<label v-for="option">{ option }</label>
		</div>
	</template>
</form>
```

```js
vouivre.bind(document.body, {
	author: {
		firstName: "Alban"
		age: 20,
	},
	options: ["France", "Italie", "Allemagne", "Suisse"],
	selectedOptions: [] // {} and new Set() are also supported
})
```

## Modifiers

Modifiers are used to alter the value of a binding. They can format the value as time or percentage, or add simple logic like inverting a value with `not` or comparing with `is`. Modifiers are applied after the property path delimited by `:`. First comes the modifier name, and then a list of parameters if needed.

```html
<div v-show="isPrivate : not">public</div>
<div v-text="now :time"></div>
<button v-disabled="status :is connected">Login</div>
```

```js
vouivre.bind(document.body, { isPrivate: true, now: Date.now(), status: "connected" });
```

If a parameter of the modifier starts with an `@`, the parameter is treated as a property path that will automatically be resolved and put in the watch list as a dependency of the binding, so that it updates when the value changes.

```html
<button v-on-click="sort :args @movieList name">public</div>
```

## Computed properties

```html
<div v-text="fullname"></div>
```

```js
vouivre.bind(document.body, {
	firstName: "John",
	lastName: "Doe",
	get fullname() {
		return this.firstName + " " + this.lastName;
	},
	fullname_dependencies: ["firstName", "lastName"]
});
```

You can tell the binding what are the dependencies of this computed property with an array with the same name as the getter + `_dependencies`. Or if you prefer you can use the `watch` modifier directly in the attribute to set the dependencies to watch.

## Advanced example

In this example we render a list of persons in a table with an input text to filter the entries and buttons on each column name to sort the list in ascending or descending order. The table body is filled by two imbricated foreach, one iterating the list and the other iterating the columns we chose to render.

```html
<input type="text" v-bind="filterName">
<table>
	<thead>
		<tr>
			<th><abbr title="Position">Pos</abbr></th>
			<template v-foreach-column="columns">
				<th>
					<div class="row">
						<span class="flex">{ column }</span>
						<button
							class="sort-btn"
							v-attr-disabled="isCurrentSort :call @sortColumn @column @sortOrder desc"
							v-on-click="sort :args @column desc"
						>
							↓</button
						><button
							class="sort-btn"
							v-attr-disabled="isCurrentSort :call @sortColumn @column @sortOrder asc"
							v-on-click="sort :args @column asc"
						>
							↑
						</button>
					</div>
				</th>
			</template>
		</tr>
	</thead>
	<tbody>
		<template v-foreach-person="filteredPersons">
			<tr>
				<th>{ $index }</th>
				<template v-foreach-column="columns">
					<td>{ person :get @column }</td>
				</template>
			</tr>
		</template>
	</tbody>
</table>
```

```js
vouivre.bind(document.body, {
	persons: [
		{
			firstName: "Merwyn",
			lastName: "Ril' Avalon",
		},
		{
			firstName: "Edwin",
			lastName: "Til' Illan",
		},
		{
			firstName: "Ewilan",
			lastName: "Gil' Sayan",
		},
		{
			firstName: "Duom",
			lastName: "Nil' Erg",
		},
		{
			firstName: "Bjorn",
			lastName: "Wil' Wayard",
		},
	],
	columns: ["firstName", "lastName"],
	
	sortColumn: undefined,
	sortOrder: "desc",
	sort(e, scope, key, order) {
		model.persons.sort((a, b) => (order == "desc" ? 1 : -1) * a[key].localeCompare(b[key]));
		model.sortColumn = key;
		model.sortOrder = order;
	},
	isCurrentSort(currentKey, key, currentOrder, order) {
		return currentKey == key && currentOrder == order;
	},
	
	filterName: "",
	get filteredPersons() {
		if (this.filterName == "") return this.persons;
		return this.persons.filter((p) =>
			p.firstName.startsWith(this.filterName) || p.lastName.startsWith(this.filterName));
	},
	filteredPersons_dependencies: ["filterName", "persons"]
});
```
