# mother-mask
The Mother-Mask is a simple and definitive Js library to implement text mask using a pattern.


## How to Install

```bash
$ npm install mother-mask --save
```

### How to Use ###

```javascript
	// get the input element
	// vanilla javascript
	var phoneInputElement = document.getElementById("myphoneinput");
	// Jquery
	var phoneInputElement = $("#myphoneinput")[0];

	// bind the element with the mask
	MotherMask.bind(phoneInputElement, "999.999.999-99");

	// create dynamic mask
	MotherMask.bind(phoneInputElement, ["(99) 9999-9999", "(99) 99999-9999"]);

```

### Simple Working demo

**[Working demo!](https://jsfiddle.net/9bcv795c/)**
