/*
 Poe eBook Framework
 Copyright 2011-2014 Metrodigi, Inc. All rights reserved.
*/
/*
---

name: Core

description: The heart of MooTools.

license: MIT-style license.

copyright: Copyright (c) 2006-2010 [Valerio Proietti](http://mad4milk.net/).

authors: The MooTools production team (http://mootools.net/developers/)

inspiration:
  - Class implementation inspired by [Base.js](http://dean.edwards.name/weblog/2006/03/base/) Copyright (c) 2006 Dean Edwards, [GNU Lesser General Public License](http://opensource.org/licenses/lgpl-license.php)
  - Some functionality inspired by [Prototype.js](http://prototypejs.org) Copyright (c) 2005-2007 Sam Stephenson, [MIT License](http://opensource.org/licenses/mit-license.php)

provides: [Core, MooTools, Type, typeOf, instanceOf, Native]

...
*/

(function(){

this.MooTools = {
	version: '1.4.1',
	build: 'd1fb25710e3c5482a219ab9dc675a4e0ad2176b6'
};

// typeOf, instanceOf
var $ = document.id;
var typeOf = this.typeOf = function(item){
	if (item == null) return 'null';
	if (item.$family) return item.$family();

	if (item.nodeName){
		if (item.nodeType == 1) return 'element';
		if (item.nodeType == 3) return (/\S/).test(item.nodeValue) ? 'textnode' : 'whitespace';
	} else if (typeof item.length == 'number'){
		if (item.callee) return 'arguments';
		if ('item' in item) return 'collection';
	}

	return typeof item;
};

var instanceOf = this.instanceOf = function(item, object){
	if (item == null) return false;
	var constructor = item.$constructor || item.constructor;
	while (constructor){
		if (constructor === object) return true;
		constructor = constructor.parent;
	}
	return item instanceof object;
};

// Function overloading

var Function = this.Function;

var enumerables = true;
for (var i in {toString: 1}) enumerables = null;
if (enumerables) enumerables = ['hasOwnProperty', 'valueOf', 'isPrototypeOf', 'propertyIsEnumerable', 'toLocaleString', 'toString', 'constructor'];

Function.prototype.overloadSetter = function(usePlural){
	var self = this;
	return function(a, b){
		if (a == null) return this;
		if (usePlural || typeof a != 'string'){
			for (var k in a) self.call(this, k, a[k]);
			if (enumerables) for (var i = enumerables.length; i--;){
				k = enumerables[i];
				if (a.hasOwnProperty(k)) self.call(this, k, a[k]);
			}
		} else {
			self.call(this, a, b);
		}
		return this;
	};
};

Function.prototype.overloadGetter = function(usePlural){
	var self = this;
	return function(a){
		var args, result;
		if (usePlural || typeof a != 'string') args = a;
		else if (arguments.length > 1) args = arguments;
		if (args){
			result = {};
			for (var i = 0; i < args.length; i++) result[args[i]] = self.call(this, args[i]);
		} else {
			result = self.call(this, a);
		}
		return result;
	};
};

Function.prototype.extend = function(key, value){
	this[key] = value;
}.overloadSetter();

Function.prototype.implement = function(key, value){
	this.prototype[key] = value;
}.overloadSetter();

// From

var slice = Array.prototype.slice;

Function.from = function(item){
	return (typeOf(item) == 'function') ? item : function(){
		return item;
	};
};

Array.from = function(item){
	if (item == null) return [];
	return (Type.isEnumerable(item) && typeof item != 'string') ? (typeOf(item) == 'array') ? item : slice.call(item) : [item];
};

Number.from = function(item){
	var number = parseFloat(item);
	return isFinite(number) ? number : null;
};

String.from = function(item){
	return item + '';
};

// hide, protect

Function.implement({

	hide: function(){
		this.$hidden = true;
		return this;
	},

	protect: function(){
		this.$protected = true;
		return this;
	}

});

// Type

var Type = this.Type = function(name, object){
	if (name){
		var lower = name.toLowerCase();
		var typeCheck = function(item){
			return (typeOf(item) == lower);
		};

		Type['is' + name] = typeCheck;
		if (object != null){
			object.prototype.$family = (function(){
				return lower;
			}).hide();
			//<1.2compat>
			object.type = typeCheck;
			//</1.2compat>
		}
	}

	if (object == null) return null;

	object.extend(this);
	object.$constructor = Type;
	object.prototype.$constructor = object;

	return object;
};

var toString = Object.prototype.toString;

Type.isEnumerable = function(item){
	return (item != null && typeof item.length == 'number' && toString.call(item) != '[object Function]' );
};

var hooks = {};

var hooksOf = function(object){
	var type = typeOf(object.prototype);
	return hooks[type] || (hooks[type] = []);
};

var implement = function(name, method){
	if (method && method.$hidden) return;

	var hooks = hooksOf(this);

	for (var i = 0; i < hooks.length; i++){
		var hook = hooks[i];
		if (typeOf(hook) == 'type') implement.call(hook, name, method);
		else hook.call(this, name, method);
	}

	var previous = this.prototype[name];
	if (previous == null || !previous.$protected) this.prototype[name] = method;

	if (this[name] == null && typeOf(method) == 'function') extend.call(this, name, function(item){
		return method.apply(item, slice.call(arguments, 1));
	});
};

var extend = function(name, method){
	if (method && method.$hidden) return;
	var previous = this[name];
	if (previous == null || !previous.$protected) this[name] = method;
};

Type.implement({

	implement: implement.overloadSetter(),

	extend: extend.overloadSetter(),

	alias: function(name, existing){
		implement.call(this, name, this.prototype[existing]);
	}.overloadSetter(),

	mirror: function(hook){
		hooksOf(this).push(hook);
		return this;
	}

});

new Type('Type', Type);

// Default Types

var force = function(name, object, methods){
	var isType = (object != Object),
		prototype = object.prototype;

	if (isType) object = new Type(name, object);

	for (var i = 0, l = methods.length; i < l; i++){
		var key = methods[i],
			generic = object[key],
			proto = prototype[key];

		if (generic) generic.protect();

		if (isType && proto){
			delete prototype[key];
			prototype[key] = proto.protect();
		}
	}

	if (isType) object.implement(prototype);

	return force;
};

force('String', String, [
	'charAt', 'charCodeAt', 'concat', 'indexOf', 'lastIndexOf', 'match', 'quote', 'replace', 'search',
	'slice', 'split', 'substr', 'substring', 'trim', 'toLowerCase', 'toUpperCase'
])('Array', Array, [
	'pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift', 'concat', 'join', 'slice',
	'indexOf', 'lastIndexOf', 'filter', 'forEach', 'every', 'map', 'some', 'reduce', 'reduceRight'
])('Number', Number, [
	'toExponential', 'toFixed', 'toLocaleString', 'toPrecision'
])('Function', Function, [
	'apply', 'call', 'bind'
])('RegExp', RegExp, [
	'exec', 'test'
])('Object', Object, [
	'create', 'defineProperty', 'defineProperties', 'keys',
	'getPrototypeOf', 'getOwnPropertyDescriptor', 'getOwnPropertyNames',
	'preventExtensions', 'isExtensible', 'seal', 'isSealed', 'freeze', 'isFrozen'
])('Date', Date, ['now']);

Object.extend = extend.overloadSetter();

Date.extend('now', function(){
	return +(new Date);
});

new Type('Boolean', Boolean);

// fixes NaN returning as Number

Number.prototype.$family = function(){
	return isFinite(this) ? 'number' : 'null';
}.hide();

// Number.random

Number.extend('random', function(min, max){
	return Math.floor(Math.random() * (max - min + 1) + min);
});

// forEach, each

var hasOwnProperty = Object.prototype.hasOwnProperty;
Object.extend('forEach', function(object, fn, bind){
	for (var key in object){
		if (hasOwnProperty.call(object, key)) fn.call(bind, object[key], key, object);
	}
});

Object.each = Object.forEach;

Array.implement({

	forEach: function(fn, bind){
		for (var i = 0, l = this.length; i < l; i++){
			if (i in this) fn.call(bind, this[i], i, this);
		}
	},

	each: function(fn, bind){
		Array.forEach(this, fn, bind);
		return this;
	}

});

// Array & Object cloning, Object merging and appending

var cloneOf = function(item){
	switch (typeOf(item)){
		case 'array': return item.clone();
		case 'object': return Object.clone(item);
		default: return item;
	}
};

Array.implement('clone', function(){
	var i = this.length, clone = new Array(i);
	while (i--) clone[i] = cloneOf(this[i]);
	return clone;
});

var mergeOne = function(source, key, current){
	switch (typeOf(current)){
		case 'object':
			if (typeOf(source[key]) == 'object') Object.merge(source[key], current);
			else source[key] = Object.clone(current);
		break;
		case 'array': source[key] = current.clone(); break;
		default: source[key] = current;
	}
	return source;
};

Object.extend({

	merge: function(source, k, v){
		if (typeOf(k) == 'string') return mergeOne(source, k, v);
		for (var i = 1, l = arguments.length; i < l; i++){
			var object = arguments[i];
			for (var key in object) mergeOne(source, key, object[key]);
		}
		return source;
	},

	clone: function(object){
		var clone = {};
		for (var key in object) clone[key] = cloneOf(object[key]);
		return clone;
	},

	append: function(original){
		for (var i = 1, l = arguments.length; i < l; i++){
			var extended = arguments[i] || {};
			for (var key in extended) original[key] = extended[key];
		}
		return original;
	}

});

// Object-less types

['Object', 'WhiteSpace', 'TextNode', 'Collection', 'Arguments'].each(function(name){
	new Type(name);
});

// Unique ID

var UID = Date.now();

String.extend('uniqueID', function(){
	return (UID++).toString(36);
});

//<1.2compat>

var Hash = this.Hash = new Type('Hash', function(object){
	if (typeOf(object) == 'hash') object = Object.clone(object.getClean());
	for (var key in object) this[key] = object[key];
	return this;
});

Hash.implement({

	forEach: function(fn, bind){
		Object.forEach(this, fn, bind);
	},

	getClean: function(){
		var clean = {};
		for (var key in this){
			if (this.hasOwnProperty(key)) clean[key] = this[key];
		}
		return clean;
	},

	getLength: function(){
		var length = 0;
		for (var key in this){
			if (this.hasOwnProperty(key)) length++;
		}
		return length;
	}

});

Hash.alias('each', 'forEach');

Object.type = Type.isObject;

var Native = this.Native = function(properties){
	return new Type(properties.name, properties.initialize);
};

Native.type = Type.type;

Native.implement = function(objects, methods){
	for (var i = 0; i < objects.length; i++) objects[i].implement(methods);
	return Native;
};

var arrayType = Array.type;
Array.type = function(item){
	return instanceOf(item, Array) || arrayType(item);
};

this.$A = function(item){
	return Array.from(item).slice();
};

this.$arguments = function(i){
	return function(){
		return arguments[i];
	};
};

this.$chk = function(obj){
	return !!(obj || obj === 0);
};

this.$clear = function(timer){
	clearTimeout(timer);
	clearInterval(timer);
	return null;
};

this.$defined = function(obj){
	return (obj != null);
};

this.$each = function(iterable, fn, bind){
	var type = typeOf(iterable);
	((type == 'arguments' || type == 'collection' || type == 'array' || type == 'elements') ? Array : Object).each(iterable, fn, bind);
};

this.$empty = function(){};

this.$extend = function(original, extended){
	return Object.append(original, extended);
};

this.$H = function(object){
	return new Hash(object);
};

this.$merge = function(){
	var args = Array.slice(arguments);
	args.unshift({});
	return Object.merge.apply(null, args);
};

this.$lambda = Function.from;
this.$mixin = Object.merge;
this.$random = Number.random;
this.$splat = Array.from;
this.$time = Date.now;

this.$type = function(object){
	var type = typeOf(object);
	if (type == 'elements') return 'array';
	return (type == 'null') ? false : type;
};

this.$unlink = function(object){
	switch (typeOf(object)){
		case 'object': return Object.clone(object);
		case 'array': return Array.clone(object);
		case 'hash': return new Hash(object);
		default: return object;
	}
};

//</1.2compat>

})();


/*
---

name: Array

description: Contains Array Prototypes like each, contains, and erase.

license: MIT-style license.

requires: Type

provides: Array

...
*/

Array.implement({

	/*<!ES5>*/
	every: function(fn, bind){
		for (var i = 0, l = this.length >>> 0; i < l; i++){
			if ((i in this) && !fn.call(bind, this[i], i, this)) return false;
		}
		return true;
	},

	filter: function(fn, bind){
		var results = [];
		for (var i = 0, l = this.length >>> 0; i < l; i++){
			if ((i in this) && fn.call(bind, this[i], i, this)) results.push(this[i]);
		}
		return results;
	},

	indexOf: function(item, from){
		var length = this.length >>> 0;
		for (var i = (from < 0) ? Math.max(0, length + from) : from || 0; i < length; i++){
			if (this[i] === item) return i;
		}
		return -1;
	},

	map: function(fn, bind){
		var length = this.length >>> 0, results = Array(length);
		for (var i = 0; i < length; i++){
			if (i in this) results[i] = fn.call(bind, this[i], i, this);
		}
		return results;
	},

	some: function(fn, bind){
		for (var i = 0, l = this.length >>> 0; i < l; i++){
			if ((i in this) && fn.call(bind, this[i], i, this)) return true;
		}
		return false;
	},
	/*</!ES5>*/

	clean: function(){
		return this.filter(function(item){
			return item != null;
		});
	},

	invoke: function(methodName){
		var args = Array.slice(arguments, 1);
		return this.map(function(item){
			return item[methodName].apply(item, args);
		});
	},

	associate: function(keys){
		var obj = {}, length = Math.min(this.length, keys.length);
		for (var i = 0; i < length; i++) obj[keys[i]] = this[i];
		return obj;
	},

	link: function(object){
		var result = {};
		for (var i = 0, l = this.length; i < l; i++){
			for (var key in object){
				if (object[key](this[i])){
					result[key] = this[i];
					delete object[key];
					break;
				}
			}
		}
		return result;
	},

	contains: function(item, from){
		return this.indexOf(item, from) != -1;
	},

	append: function(array){
		this.push.apply(this, array);
		return this;
	},

	getLast: function(){
		return (this.length) ? this[this.length - 1] : null;
	},

	getRandom: function(){
		return (this.length) ? this[Number.random(0, this.length - 1)] : null;
	},

	include: function(item){
		if (!this.contains(item)) this.push(item);
		return this;
	},

	combine: function(array){
		for (var i = 0, l = array.length; i < l; i++) this.include(array[i]);
		return this;
	},

	erase: function(item){
		for (var i = this.length; i--;){
			if (this[i] === item) this.splice(i, 1);
		}
		return this;
	},

	empty: function(){
		this.length = 0;
		return this;
	},

	flatten: function(){
		var array = [];
		for (var i = 0, l = this.length; i < l; i++){
			var type = typeOf(this[i]);
			if (type == 'null') continue;
			array = array.concat((type == 'array' || type == 'collection' || type == 'arguments' || instanceOf(this[i], Array)) ? Array.flatten(this[i]) : this[i]);
		}
		return array;
	},

	pick: function(){
		for (var i = 0, l = this.length; i < l; i++){
			if (this[i] != null) return this[i];
		}
		return null;
	},

	hexToRgb: function(array){
		if (this.length != 3) return null;
		var rgb = this.map(function(value){
			if (value.length == 1) value += value;
			return value.toInt(16);
		});
		return (array) ? rgb : 'rgb(' + rgb + ')';
	},

	rgbToHex: function(array){
		if (this.length < 3) return null;
		if (this.length == 4 && this[3] == 0 && !array) return 'transparent';
		var hex = [];
		for (var i = 0; i < 3; i++){
			var bit = (this[i] - 0).toString(16);
			hex.push((bit.length == 1) ? '0' + bit : bit);
		}
		return (array) ? hex : '#' + hex.join('');
	}

});

//<1.2compat>

Array.alias('extend', 'append');

var $pick = function(){
	return Array.from(arguments).pick();
};

//</1.2compat>


/*
---

name: Function

description: Contains Function Prototypes like create, bind, pass, and delay.

license: MIT-style license.

requires: Type

provides: Function

...
*/

Function.extend({

	attempt: function(){
		for (var i = 0, l = arguments.length; i < l; i++){
			try {
				return arguments[i]();
			} catch (e){}
		}
		return null;
	}

});

Function.implement({

	attempt: function(args, bind){
		try {
			return this.apply(bind, Array.from(args));
		} catch (e){}

		return null;
	},

	/*<!ES5-bind>*/
	bind: function(that){
		var self = this,
			args = arguments.length > 1 ? Array.slice(arguments, 1) : null,
			F = function(){};

		var bound = function(){
			var context = that, length = arguments.length;
			if (this instanceof bound){
				F.prototype = self.prototype;
				context = new F;
			}
			var result = (!args && !length)
				? self.call(context)
				: self.apply(context, args && length ? args.concat(Array.slice(arguments)) : args || arguments);
			return context == that ? result : context;
		};
		return bound;
	},
	/*</!ES5-bind>*/

	pass: function(args, bind){
		var self = this;
		if (args != null) args = Array.from(args);
		return function(){
			return self.apply(bind, args || arguments);
		};
	},

	delay: function(delay, bind, args){
		return setTimeout(this.pass((args == null ? [] : args), bind), delay);
	},

	periodical: function(periodical, bind, args){
		return setInterval(this.pass((args == null ? [] : args), bind), periodical);
	}

});

//<1.2compat>

delete Function.prototype.bind;

Function.implement({

	create: function(options){
		var self = this;
		options = options || {};
		return function(event){
			var args = options.arguments;
			args = (args != null) ? Array.from(args) : Array.slice(arguments, (options.event) ? 1 : 0);
			if (options.event) args = [event || window.event].extend(args);
			var returns = function(){
				return self.apply(options.bind || null, args);
			};
			if (options.delay) return setTimeout(returns, options.delay);
			if (options.periodical) return setInterval(returns, options.periodical);
			if (options.attempt) return Function.attempt(returns);
			return returns();
		};
	},

	bind: function(bind, args){
		var self = this;
		if (args != null) args = Array.from(args);
		return function(){
			return self.apply(bind, args || arguments);
		};
	},

	bindWithEvent: function(bind, args){
		var self = this;
		if (args != null) args = Array.from(args);
		return function(event){
			return self.apply(bind, (args == null) ? arguments : [event].concat(args));
		};
	},

	run: function(args, bind){
		return this.apply(bind, Array.from(args));
	}

});

if (Object.create == Function.prototype.create) Object.create = null;

var $try = Function.attempt;

//</1.2compat>


/*
---

name: Number

description: Contains Number Prototypes like limit, round, times, and ceil.

license: MIT-style license.

requires: Type

provides: Number

...
*/

Number.implement({

	limit: function(min, max){
		return Math.min(max, Math.max(min, this));
	},

	round: function(precision){
		precision = Math.pow(10, precision || 0).toFixed(precision < 0 ? -precision : 0);
		return Math.round(this * precision) / precision;
	},

	times: function(fn, bind){
		for (var i = 0; i < this; i++) fn.call(bind, i, this);
	},

	toFloat: function(){
		return parseFloat(this);
	},

	toInt: function(base){
		return parseInt(this, base || 10);
	}

});

Number.alias('each', 'times');

(function(math){
	var methods = {};
	math.each(function(name){
		if (!Number[name]) methods[name] = function(){
			return Math[name].apply(null, [this].concat(Array.from(arguments)));
		};
	});
	Number.implement(methods);
})(['abs', 'acos', 'asin', 'atan', 'atan2', 'ceil', 'cos', 'exp', 'floor', 'log', 'max', 'min', 'pow', 'sin', 'sqrt', 'tan']);


/*
---

name: String

description: Contains String Prototypes like camelCase, capitalize, test, and toInt.

license: MIT-style license.

requires: Type

provides: String

...
*/

String.implement({

	test: function(regex, params){
		return ((typeOf(regex) == 'regexp') ? regex : new RegExp('' + regex, params)).test(this);
	},

	contains: function(string, separator){
		return (separator) ? (separator + this + separator).indexOf(separator + string + separator) > -1 : String(this).indexOf(string) > -1;
	},

	trim: function(){
		return String(this).replace(/^\s+|\s+$/g, '');
	},

	clean: function(){
		return String(this).replace(/\s+/g, ' ').trim();
	},

	camelCase: function(){
		return String(this).replace(/-\D/g, function(match){
			return match.charAt(1).toUpperCase();
		});
	},

	hyphenate: function(){
		return String(this).replace(/[A-Z]/g, function(match){
			return ('-' + match.charAt(0).toLowerCase());
		});
	},

	capitalize: function(){
		return String(this).replace(/\b[a-z]/g, function(match){
			return match.toUpperCase();
		});
	},

	escapeRegExp: function(){
		return String(this).replace(/([-.*+?^${}()|[\]\/\\])/g, '\\$1');
	},

	toInt: function(base){
		return parseInt(this, base || 10);
	},

	toFloat: function(){
		return parseFloat(this);
	},

	hexToRgb: function(array){
		var hex = String(this).match(/^#?(\w{1,2})(\w{1,2})(\w{1,2})$/);
		return (hex) ? hex.slice(1).hexToRgb(array) : null;
	},

	rgbToHex: function(array){
		var rgb = String(this).match(/\d{1,3}/g);
		return (rgb) ? rgb.rgbToHex(array) : null;
	},

	substitute: function(object, regexp){
		return String(this).replace(regexp || (/\\?\{([^{}]+)\}/g), function(match, name){
			if (match.charAt(0) == '\\') return match.slice(1);
			return (object[name] != null) ? object[name] : '';
		});
	}

});


/*
---

name: Browser

description: The Browser Object. Contains Browser initialization, Window and Document, and the Browser Hash.

license: MIT-style license.

requires: [Array, Function, Number, String]

provides: [Browser, Window, Document]

...
*/

(function(){

var document = this.document;
var window = document.window = this;

var UID = 1;

this.$uid = (window.ActiveXObject) ? function(item){
	return (item.uid || (item.uid = [UID++]))[0];
} : function(item){
	return item.uid || (item.uid = UID++);
};

$uid(window);
$uid(document);

var ua = navigator.userAgent.toLowerCase(),
	platform = navigator.platform.toLowerCase(),
	UA = ua.match(/(opera|ie|firefox|chrome|version)[\s\/:]([\w\d\.]+)?.*?(safari|version[\s\/:]([\w\d\.]+)|$)/) || [null, 'unknown', 0],
	mode = UA[1] == 'ie' && document.documentMode;

var Browser = this.Browser = {

	extend: Function.prototype.extend,

	name: (UA[1] == 'version') ? UA[3] : UA[1],

	version: mode || parseFloat((UA[1] == 'opera' && UA[4]) ? UA[4] : UA[2]),

	Platform: {
		name: ua.match(/ip(?:ad|od|hone)/) ? 'ios' : (ua.match(/(?:webos|android)/) || platform.match(/mac|win|linux/) || ['other'])[0]
	},

	Features: {
		xpath: !!(document.evaluate),
		air: !!(window.runtime),
		query: !!(document.querySelector),
		json: !!(window.JSON)
	},

	Plugins: {}

};

Browser[Browser.name] = true;
Browser[Browser.name + parseInt(Browser.version, 10)] = true;
Browser.Platform[Browser.Platform.name] = true;

// Request

Browser.Request = (function(){

	var XMLHTTP = function(){
		return new XMLHttpRequest();
	};

	var MSXML2 = function(){
		return new ActiveXObject('MSXML2.XMLHTTP');
	};

	var MSXML = function(){
		return new ActiveXObject('Microsoft.XMLHTTP');
	};

	return Function.attempt(function(){
		XMLHTTP();
		return XMLHTTP;
	}, function(){
		MSXML2();
		return MSXML2;
	}, function(){
		MSXML();
		return MSXML;
	});

})();

Browser.Features.xhr = !!(Browser.Request);

// Flash detection

var version = (Function.attempt(function(){
	return navigator.plugins['Shockwave Flash'].description;
}, function(){
	return new ActiveXObject('ShockwaveFlash.ShockwaveFlash').GetVariable('$version');
}) || '0 r0').match(/\d+/g);

Browser.Plugins.Flash = {
	version: Number(version[0] || '0.' + version[1]) || 0,
	build: Number(version[2]) || 0
};

// String scripts

Browser.exec = function(text){
	if (!text) return text;
	if (window.execScript){
		window.execScript(text);
	} else {
		var script = document.createElement('script');
		script.setAttribute('type', 'text/javascript');
		script.text = text;
		document.head.appendChild(script);
		document.head.removeChild(script);
	}
	return text;
};

String.implement('stripScripts', function(exec){
	var scripts = '';
	var text = this.replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, function(all, code){
		scripts += code + '\n';
		return '';
	});
	if (exec === true) Browser.exec(scripts);
	else if (typeOf(exec) == 'function') exec(scripts, text);
	return text;
});

// Window, Document

Browser.extend({
	Document: this.Document,
	Window: this.Window,
	Element: this.Element,
	Event: this.Event
});

this.Window = this.$constructor = new Type('Window', function(){});

this.$family = Function.from('window').hide();

Window.mirror(function(name, method){
	window[name] = method;
});

this.Document = document.$constructor = new Type('Document', function(){});

document.$family = Function.from('document').hide();

Document.mirror(function(name, method){
	document[name] = method;
});

document.html = document.documentElement;
if (!document.head) document.head = document.getElementsByTagName('head')[0];

if (document.execCommand) try {
	document.execCommand("BackgroundImageCache", false, true);
} catch (e){}

/*<ltIE9>*/
if (this.attachEvent && !this.addEventListener){
	var unloadEvent = function(){
		this.detachEvent('onunload', unloadEvent);
		document.head = document.html = document.window = null;
	};
	this.attachEvent('onunload', unloadEvent);
}

// IE fails on collections and <select>.options (refers to <select>)
var arrayFrom = Array.from;
try {
	arrayFrom(document.html.childNodes);
} catch(e){
	Array.from = function(item){
		if (typeof item != 'string' && Type.isEnumerable(item) && typeOf(item) != 'array'){
			var i = item.length, array = new Array(i);
			while (i--) array[i] = item[i];
			return array;
		}
		return arrayFrom(item);
	};

	var prototype = Array.prototype,
		slice = prototype.slice;
	['pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift', 'concat', 'join', 'slice'].each(function(name){
		var method = prototype[name];
		Array[name] = function(item){
			return method.apply(Array.from(item), slice.call(arguments, 1));
		};
	});
}
/*</ltIE9>*/

//<1.2compat>

if (Browser.Platform.ios) Browser.Platform.ipod = true;

Browser.Engine = {};

var setEngine = function(name, version){
	Browser.Engine.name = name;
	Browser.Engine[name + version] = true;
	Browser.Engine.version = version;
};

if (Browser.ie){
	Browser.Engine.trident = true;

	switch (Browser.version){
		case 6: setEngine('trident', 4); break;
		case 7: setEngine('trident', 5); break;
		case 8: setEngine('trident', 6);
	}
}

if (Browser.firefox){
	Browser.Engine.gecko = true;

	if (Browser.version >= 3) setEngine('gecko', 19);
	else setEngine('gecko', 18);
}

if (Browser.safari || Browser.chrome){
	Browser.Engine.webkit = true;

	switch (Browser.version){
		case 2: setEngine('webkit', 419); break;
		case 3: setEngine('webkit', 420); break;
		case 4: setEngine('webkit', 525);
	}
}

if (Browser.opera){
	Browser.Engine.presto = true;

	if (Browser.version >= 9.6) setEngine('presto', 960);
	else if (Browser.version >= 9.5) setEngine('presto', 950);
	else setEngine('presto', 925);
}

if (Browser.name == 'unknown'){
	switch ((ua.match(/(?:webkit|khtml|gecko)/) || [])[0]){
		case 'webkit':
		case 'khtml':
			Browser.Engine.webkit = true;
		break;
		case 'gecko':
			Browser.Engine.gecko = true;
	}
}

this.$exec = Browser.exec;

//</1.2compat>

})();


/*
---

name: Object

description: Object generic methods

license: MIT-style license.

requires: Type

provides: [Object, Hash]

...
*/

(function(){

var hasOwnProperty = Object.prototype.hasOwnProperty;

Object.extend({

	subset: function(object, keys){
		var results = {};
		for (var i = 0, l = keys.length; i < l; i++){
			var k = keys[i];
			if (k in object) results[k] = object[k];
		}
		return results;
	},

	map: function(object, fn, bind){
		var results = {};
		for (var key in object){
			if (hasOwnProperty.call(object, key)) results[key] = fn.call(bind, object[key], key, object);
		}
		return results;
	},

	filter: function(object, fn, bind){
		var results = {};
		for (var key in object){
			var value = object[key];
			if (hasOwnProperty.call(object, key) && fn.call(bind, value, key, object)) results[key] = value;
		}
		return results;
	},

	every: function(object, fn, bind){
		for (var key in object){
			if (hasOwnProperty.call(object, key) && !fn.call(bind, object[key], key)) return false;
		}
		return true;
	},

	some: function(object, fn, bind){
		for (var key in object){
			if (hasOwnProperty.call(object, key) && fn.call(bind, object[key], key)) return true;
		}
		return false;
	},

	keys: function(object){
		var keys = [];
		for (var key in object){
			if (hasOwnProperty.call(object, key)) keys.push(key);
		}
		return keys;
	},

	values: function(object){
		var values = [];
		for (var key in object){
			if (hasOwnProperty.call(object, key)) values.push(object[key]);
		}
		return values;
	},

	getLength: function(object){
		return Object.keys(object).length;
	},

	keyOf: function(object, value){
		for (var key in object){
			if (hasOwnProperty.call(object, key) && object[key] === value) return key;
		}
		return null;
	},

	contains: function(object, value){
		return Object.keyOf(object, value) != null;
	},

	toQueryString: function(object, base){
		var queryString = [];

		Object.each(object, function(value, key){
			if (base) key = base + '[' + key + ']';
			var result;
			switch (typeOf(value)){
				case 'object': result = Object.toQueryString(value, key); break;
				case 'array':
					var qs = {};
					value.each(function(val, i){
						qs[i] = val;
					});
					result = Object.toQueryString(qs, key);
				break;
				default: result = key + '=' + encodeURIComponent(value);
			}
			if (value != null) queryString.push(result);
		});

		return queryString.join('&');
	}

});

})();

//<1.2compat>

Hash.implement({

	has: Object.prototype.hasOwnProperty,

	keyOf: function(value){
		return Object.keyOf(this, value);
	},

	hasValue: function(value){
		return Object.contains(this, value);
	},

	extend: function(properties){
		Hash.each(properties || {}, function(value, key){
			Hash.set(this, key, value);
		}, this);
		return this;
	},

	combine: function(properties){
		Hash.each(properties || {}, function(value, key){
			Hash.include(this, key, value);
		}, this);
		return this;
	},

	erase: function(key){
		if (this.hasOwnProperty(key)) delete this[key];
		return this;
	},

	get: function(key){
		return (this.hasOwnProperty(key)) ? this[key] : null;
	},

	set: function(key, value){
		if (!this[key] || this.hasOwnProperty(key)) this[key] = value;
		return this;
	},

	empty: function(){
		Hash.each(this, function(value, key){
			delete this[key];
		}, this);
		return this;
	},

	include: function(key, value){
		if (this[key] == null) this[key] = value;
		return this;
	},

	map: function(fn, bind){
		return new Hash(Object.map(this, fn, bind));
	},

	filter: function(fn, bind){
		return new Hash(Object.filter(this, fn, bind));
	},

	every: function(fn, bind){
		return Object.every(this, fn, bind);
	},

	some: function(fn, bind){
		return Object.some(this, fn, bind);
	},

	getKeys: function(){
		return Object.keys(this);
	},

	getValues: function(){
		return Object.values(this);
	},

	toQueryString: function(base){
		return Object.toQueryString(this, base);
	}

});

Hash.extend = Object.append;

Hash.alias({indexOf: 'keyOf', contains: 'hasValue'});

//</1.2compat>


/*
---
name: Slick.Parser
description: Standalone CSS3 Selector parser
provides: Slick.Parser
...
*/

;(function(){

var parsed,
	separatorIndex,
	combinatorIndex,
	reversed,
	cache = {},
	reverseCache = {},
	reUnescape = /\\/g;

var parse = function(expression, isReversed){
	if (expression == null) return null;
	if (expression.Slick === true) return expression;
	expression = ('' + expression).replace(/^\s+|\s+$/g, '');
	reversed = !!isReversed;
	var currentCache = (reversed) ? reverseCache : cache;
	if (currentCache[expression]) return currentCache[expression];
	parsed = {
		Slick: true,
		expressions: [],
		raw: expression,
		reverse: function(){
			return parse(this.raw, true);
		}
	};
	separatorIndex = -1;
	while (expression != (expression = expression.replace(regexp, parser)));
	parsed.length = parsed.expressions.length;
	return currentCache[parsed.raw] = (reversed) ? reverse(parsed) : parsed;
};

var reverseCombinator = function(combinator){
	if (combinator === '!') return ' ';
	else if (combinator === ' ') return '!';
	else if ((/^!/).test(combinator)) return combinator.replace(/^!/, '');
	else return '!' + combinator;
};

var reverse = function(expression){
	var expressions = expression.expressions;
	for (var i = 0; i < expressions.length; i++){
		var exp = expressions[i];
		var last = {parts: [], tag: '*', combinator: reverseCombinator(exp[0].combinator)};

		for (var j = 0; j < exp.length; j++){
			var cexp = exp[j];
			if (!cexp.reverseCombinator) cexp.reverseCombinator = ' ';
			cexp.combinator = cexp.reverseCombinator;
			delete cexp.reverseCombinator;
		}

		exp.reverse().push(last);
	}
	return expression;
};

var escapeRegExp = function(string){// Credit: XRegExp 0.6.1 (c) 2007-2008 Steven Levithan <http://stevenlevithan.com/regex/xregexp/> MIT License
	return string.replace(/[-[\]{}()*+?.\\^$|,#\s]/g, function(match){
		return '\\' + match;
	});
};

var regexp = new RegExp(
/*
#!/usr/bin/env ruby
puts "\t\t" + DATA.read.gsub(/\(\?x\)|\s+#.*$|\s+|\\$|\\n/,'')
__END__
	"(?x)^(?:\
	  \\s* ( , ) \\s*               # Separator          \n\
	| \\s* ( <combinator>+ ) \\s*   # Combinator         \n\
	|      ( \\s+ )                 # CombinatorChildren \n\
	|      ( <unicode>+ | \\* )     # Tag                \n\
	| \\#  ( <unicode>+       )     # ID                 \n\
	| \\.  ( <unicode>+       )     # ClassName          \n\
	|                               # Attribute          \n\
	\\[  \
		\\s* (<unicode1>+)  (?:  \
			\\s* ([*^$!~|]?=)  (?:  \
				\\s* (?:\
					([\"']?)(.*?)\\9 \
				)\
			)  \
		)?  \\s*  \
	\\](?!\\]) \n\
	|   :+ ( <unicode>+ )(?:\
	\\( (?:\
		(?:([\"'])([^\\12]*)\\12)|((?:\\([^)]+\\)|[^()]*)+)\
	) \\)\
	)?\
	)"
*/
	"^(?:\\s*(,)\\s*|\\s*(<combinator>+)\\s*|(\\s+)|(<unicode>+|\\*)|\\#(<unicode>+)|\\.(<unicode>+)|\\[\\s*(<unicode1>+)(?:\\s*([*^$!~|]?=)(?:\\s*(?:([\"']?)(.*?)\\9)))?\\s*\\](?!\\])|(:+)(<unicode>+)(?:\\((?:(?:([\"'])([^\\13]*)\\13)|((?:\\([^)]+\\)|[^()]*)+))\\))?)"
	.replace(/<combinator>/, '[' + escapeRegExp(">+~`!@$%^&={}\\;</") + ']')
	.replace(/<unicode>/g, '(?:[\\w\\u00a1-\\uFFFF-]|\\\\[^\\s0-9a-f])')
	.replace(/<unicode1>/g, '(?:[:\\w\\u00a1-\\uFFFF-]|\\\\[^\\s0-9a-f])')
);

function parser(
	rawMatch,

	separator,
	combinator,
	combinatorChildren,

	tagName,
	id,
	className,

	attributeKey,
	attributeOperator,
	attributeQuote,
	attributeValue,

	pseudoMarker,
	pseudoClass,
	pseudoQuote,
	pseudoClassQuotedValue,
	pseudoClassValue
){
	if (separator || separatorIndex === -1){
		parsed.expressions[++separatorIndex] = [];
		combinatorIndex = -1;
		if (separator) return '';
	}

	if (combinator || combinatorChildren || combinatorIndex === -1){
		combinator = combinator || ' ';
		var currentSeparator = parsed.expressions[separatorIndex];
		if (reversed && currentSeparator[combinatorIndex])
			currentSeparator[combinatorIndex].reverseCombinator = reverseCombinator(combinator);
		currentSeparator[++combinatorIndex] = {combinator: combinator, tag: '*'};
	}

	var currentParsed = parsed.expressions[separatorIndex][combinatorIndex];

	if (tagName){
		currentParsed.tag = tagName.replace(reUnescape, '');

	} else if (id){
		currentParsed.id = id.replace(reUnescape, '');

	} else if (className){
		className = className.replace(reUnescape, '');

		if (!currentParsed.classList) currentParsed.classList = [];
		if (!currentParsed.classes) currentParsed.classes = [];
		currentParsed.classList.push(className);
		currentParsed.classes.push({
			value: className,
			regexp: new RegExp('(^|\\s)' + escapeRegExp(className) + '(\\s|$)')
		});

	} else if (pseudoClass){
		pseudoClassValue = pseudoClassValue || pseudoClassQuotedValue;
		pseudoClassValue = pseudoClassValue ? pseudoClassValue.replace(reUnescape, '') : null;

		if (!currentParsed.pseudos) currentParsed.pseudos = [];
		currentParsed.pseudos.push({
			key: pseudoClass.replace(reUnescape, ''),
			value: pseudoClassValue,
			type: pseudoMarker.length == 1 ? 'class' : 'element'
		});

	} else if (attributeKey){
		attributeKey = attributeKey.replace(reUnescape, '');
		attributeValue = (attributeValue || '').replace(reUnescape, '');

		var test, regexp;

		switch (attributeOperator){
			case '^=' : regexp = new RegExp(       '^'+ escapeRegExp(attributeValue)            ); break;
			case '$=' : regexp = new RegExp(            escapeRegExp(attributeValue) +'$'       ); break;
			case '~=' : regexp = new RegExp( '(^|\\s)'+ escapeRegExp(attributeValue) +'(\\s|$)' ); break;
			case '|=' : regexp = new RegExp(       '^'+ escapeRegExp(attributeValue) +'(-|$)'   ); break;
			case  '=' : test = function(value){
				return attributeValue == value;
			}; break;
			case '*=' : test = function(value){
				return value && value.indexOf(attributeValue) > -1;
			}; break;
			case '!=' : test = function(value){
				return attributeValue != value;
			}; break;
			default   : test = function(value){
				return !!value;
			};
		}

		if (attributeValue == '' && (/^[*$^]=$/).test(attributeOperator)) test = function(){
			return false;
		};

		if (!test) test = function(value){
			return value && regexp.test(value);
		};

		if (!currentParsed.attributes) currentParsed.attributes = [];
		currentParsed.attributes.push({
			key: attributeKey,
			operator: attributeOperator,
			value: attributeValue,
			test: test
		});

	}

	return '';
};

// Slick NS

var Slick = (this.Slick || {});

Slick.parse = function(expression){
	return parse(expression);
};

Slick.escapeRegExp = escapeRegExp;

if (!this.Slick) this.Slick = Slick;

}).apply(/*<CommonJS>*/(typeof exports != 'undefined') ? exports : /*</CommonJS>*/this);


/*
---
name: Slick.Finder
description: The new, superfast css selector engine.
provides: Slick.Finder
requires: Slick.Parser
...
*/

;(function(){

var local = {},
	featuresCache = {},
	toString = Object.prototype.toString;

// Feature / Bug detection

local.isNativeCode = function(fn){
	return (/\{\s*\[native code\]\s*\}/).test('' + fn);
};

local.isXML = function(document){
	return (!!document.xmlVersion) || (!!document.xml) || (toString.call(document) == '[object XMLDocument]') ||
	(document.nodeType == 9 && document.documentElement.nodeName != 'HTML');
};

local.setDocument = function(document){

	// convert elements / window arguments to document. if document cannot be extrapolated, the function returns.
	var nodeType = document.nodeType;
	if (nodeType == 9); // document
	else if (nodeType) document = document.ownerDocument; // node
	else if (document.navigator) document = document.document; // window
	else return;

	// check if it's the old document

	if (this.document === document) return;
	this.document = document;

	// check if we have done feature detection on this document before

	var root = document.documentElement,
		rootUid = this.getUIDXML(root),
		features = featuresCache[rootUid],
		feature;

	if (features){
		for (feature in features){
			this[feature] = features[feature];
		}
		return;
	}

	features = featuresCache[rootUid] = {};

	features.root = root;
	features.isXMLDocument = this.isXML(document);

	features.brokenStarGEBTN
	= features.starSelectsClosedQSA
	= features.idGetsName
	= features.brokenMixedCaseQSA
	= features.brokenGEBCN
	= features.brokenCheckedQSA
	= features.brokenEmptyAttributeQSA
	= features.isHTMLDocument
	= features.nativeMatchesSelector
	= false;

	var starSelectsClosed, starSelectsComments,
		brokenSecondClassNameGEBCN, cachedGetElementsByClassName,
		brokenFormAttributeGetter;

	var selected, id = 'slick_uniqueid';
	var testNode = document.createElement('div');

	var testRoot = document.body || document.getElementsByTagName('body')[0] || root;
	testRoot.appendChild(testNode);

	// on non-HTML documents innerHTML and getElementsById doesnt work properly
	try {
		testNode.innerHTML = '<a id="'+id+'"></a>';
		features.isHTMLDocument = !!document.getElementById(id);
	} catch(e){};

	if (features.isHTMLDocument){

		testNode.style.display = 'none';

		// IE returns comment nodes for getElementsByTagName('*') for some documents
		testNode.appendChild(document.createComment(''));
		starSelectsComments = (testNode.getElementsByTagName('*').length > 1);

		// IE returns closed nodes (EG:"</foo>") for getElementsByTagName('*') for some documents
		try {
			testNode.innerHTML = 'foo</foo>';
			selected = testNode.getElementsByTagName('*');
			starSelectsClosed = (selected && !!selected.length && selected[0].nodeName.charAt(0) == '/');
		} catch(e){};

		features.brokenStarGEBTN = starSelectsComments || starSelectsClosed;

		// IE returns elements with the name instead of just id for getElementsById for some documents
		try {
			testNode.innerHTML = '<a name="'+ id +'"></a><b id="'+ id +'"></b>';
			features.idGetsName = document.getElementById(id) === testNode.firstChild;
		} catch(e){};

		if (testNode.getElementsByClassName){

			// Safari 3.2 getElementsByClassName caches results
			try {
				testNode.innerHTML = '<a class="f"></a><a class="b"></a>';
				testNode.getElementsByClassName('b').length;
				testNode.firstChild.className = 'b';
				cachedGetElementsByClassName = (testNode.getElementsByClassName('b').length != 2);
			} catch(e){};

			// Opera 9.6 getElementsByClassName doesnt detects the class if its not the first one
			try {
				testNode.innerHTML = '<a class="a"></a><a class="f b a"></a>';
				brokenSecondClassNameGEBCN = (testNode.getElementsByClassName('a').length != 2);
			} catch(e){};

			features.brokenGEBCN = cachedGetElementsByClassName || brokenSecondClassNameGEBCN;
		}

		if (testNode.querySelectorAll){
			// IE 8 returns closed nodes (EG:"</foo>") for querySelectorAll('*') for some documents
			try {
				testNode.innerHTML = 'foo</foo>';
				selected = testNode.querySelectorAll('*');
				features.starSelectsClosedQSA = (selected && !!selected.length && selected[0].nodeName.charAt(0) == '/');
			} catch(e){};

			// Safari 3.2 querySelectorAll doesnt work with mixedcase on quirksmode
			try {
				testNode.innerHTML = '<a class="MiX"></a>';
				features.brokenMixedCaseQSA = !testNode.querySelectorAll('.MiX').length;
			} catch(e){};

			// Webkit and Opera dont return selected options on querySelectorAll
			try {
				testNode.innerHTML = '<select><option selected="selected">a</option></select>';
				features.brokenCheckedQSA = (testNode.querySelectorAll(':checked').length == 0);
			} catch(e){};

			// IE returns incorrect results for attr[*^$]="" selectors on querySelectorAll
			try {
				testNode.innerHTML = '<a class=""></a>';
				features.brokenEmptyAttributeQSA = (testNode.querySelectorAll('[class*=""]').length != 0);
			} catch(e){};

		}

		// IE6-7, if a form has an input of id x, form.getAttribute(x) returns a reference to the input
		try {
			testNode.innerHTML = '<form action="s"><input id="action"/></form>';
			brokenFormAttributeGetter = (testNode.firstChild.getAttribute('action') != 's');
		} catch(e){};

		// native matchesSelector function

		features.nativeMatchesSelector = root.matchesSelector || /*root.msMatchesSelector ||*/ root.mozMatchesSelector || root.webkitMatchesSelector;
		if (features.nativeMatchesSelector) try {
			// if matchesSelector trows errors on incorrect sintaxes we can use it
			features.nativeMatchesSelector.call(root, ':slick');
			features.nativeMatchesSelector = null;
		} catch(e){};

	}

	try {
		root.slick_expando = 1;
		delete root.slick_expando;
		features.getUID = this.getUIDHTML;
	} catch(e) {
		features.getUID = this.getUIDXML;
	}

	testRoot.removeChild(testNode);
	testNode = selected = testRoot = null;

	// getAttribute

	features.getAttribute = (features.isHTMLDocument && brokenFormAttributeGetter) ? function(node, name){
		var method = this.attributeGetters[name];
		if (method) return method.call(node);
		var attributeNode = node.getAttributeNode(name);
		return (attributeNode) ? attributeNode.nodeValue : null;
	} : function(node, name){
		var method = this.attributeGetters[name];
		return (method) ? method.call(node) : node.getAttribute(name);
	};

	// hasAttribute

	features.hasAttribute = (root && this.isNativeCode(root.hasAttribute)) ? function(node, attribute) {
		return node.hasAttribute(attribute);
	} : function(node, attribute) {
		node = node.getAttributeNode(attribute);
		return !!(node && (node.specified || node.nodeValue));
	};

	// contains
	// FIXME: Add specs: local.contains should be different for xml and html documents?
	features.contains = (root && this.isNativeCode(root.contains)) ? function(context, node){
		return context.contains(node);
	} : (root && root.compareDocumentPosition) ? function(context, node){
		return context === node || !!(context.compareDocumentPosition(node) & 16);
	} : function(context, node){
		if (node) do {
			if (node === context) return true;
		} while ((node = node.parentNode));
		return false;
	};

	// document order sorting
	// credits to Sizzle (http://sizzlejs.com/)

	features.documentSorter = (root.compareDocumentPosition) ? function(a, b){
		if (!a.compareDocumentPosition || !b.compareDocumentPosition) return 0;
		return a.compareDocumentPosition(b) & 4 ? -1 : a === b ? 0 : 1;
	} : ('sourceIndex' in root) ? function(a, b){
		if (!a.sourceIndex || !b.sourceIndex) return 0;
		return a.sourceIndex - b.sourceIndex;
	} : (document.createRange) ? function(a, b){
		if (!a.ownerDocument || !b.ownerDocument) return 0;
		var aRange = a.ownerDocument.createRange(), bRange = b.ownerDocument.createRange();
		aRange.setStart(a, 0);
		aRange.setEnd(a, 0);
		bRange.setStart(b, 0);
		bRange.setEnd(b, 0);
		return aRange.compareBoundaryPoints(Range.START_TO_END, bRange);
	} : null ;

	root = null;

	for (feature in features){
		this[feature] = features[feature];
	}
};

// Main Method

var reSimpleSelector = /^([#.]?)((?:[\w-]+|\*))$/,
	reEmptyAttribute = /\[.+[*$^]=(?:""|'')?\]/,
	qsaFailExpCache = {};

local.search = function(context, expression, append, first){

	var found = this.found = (first) ? null : (append || []);

	if (!context) return found;
	else if (context.navigator) context = context.document; // Convert the node from a window to a document
	else if (!context.nodeType) return found;

	// setup

	var parsed, i,
		uniques = this.uniques = {},
		hasOthers = !!(append && append.length),
		contextIsDocument = (context.nodeType == 9);

	if (this.document !== (contextIsDocument ? context : context.ownerDocument)) this.setDocument(context);

	// avoid duplicating items already in the append array
	if (hasOthers) for (i = found.length; i--;) uniques[this.getUID(found[i])] = true;

	// expression checks

	if (typeof expression == 'string'){ // expression is a string

		/*<simple-selectors-override>*/
		var simpleSelector = expression.match(reSimpleSelector);
		simpleSelectors: if (simpleSelector) {

			var symbol = simpleSelector[1],
				name = simpleSelector[2],
				node, nodes;

			if (!symbol){

				if (name == '*' && this.brokenStarGEBTN) break simpleSelectors;
				nodes = context.getElementsByTagName(name);
				if (first) return nodes[0] || null;
				for (i = 0; node = nodes[i++];){
					if (!(hasOthers && uniques[this.getUID(node)])) found.push(node);
				}

			} else if (symbol == '#'){

				if (!this.isHTMLDocument || !contextIsDocument) break simpleSelectors;
				node = context.getElementById(name);
				if (!node) return found;
				if (this.idGetsName && node.getAttributeNode('id').nodeValue != name) break simpleSelectors;
				if (first) return node || null;
				if (!(hasOthers && uniques[this.getUID(node)])) found.push(node);

			} else if (symbol == '.'){

				if (!this.isHTMLDocument || ((!context.getElementsByClassName || this.brokenGEBCN) && context.querySelectorAll)) break simpleSelectors;
				if (context.getElementsByClassName && !this.brokenGEBCN){
					nodes = context.getElementsByClassName(name);
					if (first) return nodes[0] || null;
					for (i = 0; node = nodes[i++];){
						if (!(hasOthers && uniques[this.getUID(node)])) found.push(node);
					}
				} else {
					var matchClass = new RegExp('(^|\\s)'+ Slick.escapeRegExp(name) +'(\\s|$)');
					nodes = context.getElementsByTagName('*');
					for (i = 0; node = nodes[i++];){
						className = node.className;
						if (!(className && matchClass.test(className))) continue;
						if (first) return node;
						if (!(hasOthers && uniques[this.getUID(node)])) found.push(node);
					}
				}

			}

			if (hasOthers) this.sort(found);
			return (first) ? null : found;

		}
		/*</simple-selectors-override>*/

		/*<query-selector-override>*/
		querySelector: if (context.querySelectorAll) {

			if (!this.isHTMLDocument
				|| qsaFailExpCache[expression]
				//TODO: only skip when expression is actually mixed case
				|| this.brokenMixedCaseQSA
				|| (this.brokenCheckedQSA && expression.indexOf(':checked') > -1)
				|| (this.brokenEmptyAttributeQSA && reEmptyAttribute.test(expression))
				|| (!contextIsDocument //Abort when !contextIsDocument and...
					//  there are multiple expressions in the selector
					//  since we currently only fix non-document rooted QSA for single expression selectors
					&& expression.indexOf(',') > -1
				)
				|| Slick.disableQSA
			) break querySelector;

			var _expression = expression, _context = context;
			if (!contextIsDocument){
				// non-document rooted QSA
				// credits to Andrew Dupont
				var currentId = _context.getAttribute('id'), slickid = 'slickid__';
				_context.setAttribute('id', slickid);
				_expression = '#' + slickid + ' ' + _expression;
				context = _context.parentNode;
			}

			try {
				if (first) return context.querySelector(_expression) || null;
				else nodes = context.querySelectorAll(_expression);
			} catch(e) {
				qsaFailExpCache[expression] = 1;
				break querySelector;
			} finally {
				if (!contextIsDocument){
					if (currentId) _context.setAttribute('id', currentId);
					else _context.removeAttribute('id');
					context = _context;
				}
			}

			if (this.starSelectsClosedQSA) for (i = 0; node = nodes[i++];){
				if (node.nodeName > '@' && !(hasOthers && uniques[this.getUID(node)])) found.push(node);
			} else for (i = 0; node = nodes[i++];){
				if (!(hasOthers && uniques[this.getUID(node)])) found.push(node);
			}

			if (hasOthers) this.sort(found);
			return found;

		}
		/*</query-selector-override>*/

		parsed = this.Slick.parse(expression);
		if (!parsed.length) return found;
	} else if (expression == null){ // there is no expression
		return found;
	} else if (expression.Slick){ // expression is a parsed Slick object
		parsed = expression;
	} else if (this.contains(context.documentElement || context, expression)){ // expression is a node
		(found) ? found.push(expression) : found = expression;
		return found;
	} else { // other junk
		return found;
	}

	/*<pseudo-selectors>*//*<nth-pseudo-selectors>*/

	// cache elements for the nth selectors

	this.posNTH = {};
	this.posNTHLast = {};
	this.posNTHType = {};
	this.posNTHTypeLast = {};

	/*</nth-pseudo-selectors>*//*</pseudo-selectors>*/

	// if append is null and there is only a single selector with one expression use pushArray, else use pushUID
	this.push = (!hasOthers && (first || (parsed.length == 1 && parsed.expressions[0].length == 1))) ? this.pushArray : this.pushUID;

	if (found == null) found = [];

	// default engine

	var j, m, n;
	var combinator, tag, id, classList, classes, attributes, pseudos;
	var currentItems, currentExpression, currentBit, lastBit, expressions = parsed.expressions;

	search: for (i = 0; (currentExpression = expressions[i]); i++) for (j = 0; (currentBit = currentExpression[j]); j++){

		combinator = 'combinator:' + currentBit.combinator;
		if (!this[combinator]) continue search;

		tag        = (this.isXMLDocument) ? currentBit.tag : currentBit.tag.toUpperCase();
		id         = currentBit.id;
		classList  = currentBit.classList;
		classes    = currentBit.classes;
		attributes = currentBit.attributes;
		pseudos    = currentBit.pseudos;
		lastBit    = (j === (currentExpression.length - 1));

		this.bitUniques = {};

		if (lastBit){
			this.uniques = uniques;
			this.found = found;
		} else {
			this.uniques = {};
			this.found = [];
		}

		if (j === 0){
			this[combinator](context, tag, id, classes, attributes, pseudos, classList);
			if (first && lastBit && found.length) break search;
		} else {
			if (first && lastBit) for (m = 0, n = currentItems.length; m < n; m++){
				this[combinator](currentItems[m], tag, id, classes, attributes, pseudos, classList);
				if (found.length) break search;
			} else for (m = 0, n = currentItems.length; m < n; m++) this[combinator](currentItems[m], tag, id, classes, attributes, pseudos, classList);
		}

		currentItems = this.found;
	}

	// should sort if there are nodes in append and if you pass multiple expressions.
	if (hasOthers || (parsed.expressions.length > 1)) this.sort(found);

	return (first) ? (found[0] || null) : found;
};

// Utils

local.uidx = 1;
local.uidk = 'slick-uniqueid';

local.getUIDXML = function(node){
	var uid = node.getAttribute(this.uidk);
	if (!uid){
		uid = this.uidx++;
		node.setAttribute(this.uidk, uid);
	}
	return uid;
};

local.getUIDHTML = function(node){
	return node.uniqueNumber || (node.uniqueNumber = this.uidx++);
};

// sort based on the setDocument documentSorter method.

local.sort = function(results){
	if (!this.documentSorter) return results;
	results.sort(this.documentSorter);
	return results;
};

/*<pseudo-selectors>*//*<nth-pseudo-selectors>*/

local.cacheNTH = {};

local.matchNTH = /^([+-]?\d*)?([a-z]+)?([+-]\d+)?$/;

local.parseNTHArgument = function(argument){
	var parsed = argument.match(this.matchNTH);
	if (!parsed) return false;
	var special = parsed[2] || false;
	var a = parsed[1] || 1;
	if (a == '-') a = -1;
	var b = +parsed[3] || 0;
	parsed =
		(special == 'n')	? {a: a, b: b} :
		(special == 'odd')	? {a: 2, b: 1} :
		(special == 'even')	? {a: 2, b: 0} : {a: 0, b: a};

	return (this.cacheNTH[argument] = parsed);
};

local.createNTHPseudo = function(child, sibling, positions, ofType){
	return function(node, argument){
		var uid = this.getUID(node);
		if (!this[positions][uid]){
			var parent = node.parentNode;
			if (!parent) return false;
			var el = parent[child], count = 1;
			if (ofType){
				var nodeName = node.nodeName;
				do {
					if (el.nodeName != nodeName) continue;
					this[positions][this.getUID(el)] = count++;
				} while ((el = el[sibling]));
			} else {
				do {
					if (el.nodeType != 1) continue;
					this[positions][this.getUID(el)] = count++;
				} while ((el = el[sibling]));
			}
		}
		argument = argument || 'n';
		var parsed = this.cacheNTH[argument] || this.parseNTHArgument(argument);
		if (!parsed) return false;
		var a = parsed.a, b = parsed.b, pos = this[positions][uid];
		if (a == 0) return b == pos;
		if (a > 0){
			if (pos < b) return false;
		} else {
			if (b < pos) return false;
		}
		return ((pos - b) % a) == 0;
	};
};

/*</nth-pseudo-selectors>*//*</pseudo-selectors>*/

local.pushArray = function(node, tag, id, classes, attributes, pseudos){
	if (this.matchSelector(node, tag, id, classes, attributes, pseudos)) this.found.push(node);
};

local.pushUID = function(node, tag, id, classes, attributes, pseudos){
	var uid = this.getUID(node);
	if (!this.uniques[uid] && this.matchSelector(node, tag, id, classes, attributes, pseudos)){
		this.uniques[uid] = true;
		this.found.push(node);
	}
};

local.matchNode = function(node, selector){
	if (this.isHTMLDocument && this.nativeMatchesSelector){
		try {
			return this.nativeMatchesSelector.call(node, selector.replace(/\[([^=]+)=\s*([^'"\]]+?)\s*\]/g, '[$1="$2"]'));
		} catch(matchError) {}
	}

	var parsed = this.Slick.parse(selector);
	if (!parsed) return true;

	// simple (single) selectors
	var expressions = parsed.expressions, simpleExpCounter = 0, i;
	for (i = 0; (currentExpression = expressions[i]); i++){
		if (currentExpression.length == 1){
			var exp = currentExpression[0];
			if (this.matchSelector(node, (this.isXMLDocument) ? exp.tag : exp.tag.toUpperCase(), exp.id, exp.classes, exp.attributes, exp.pseudos)) return true;
			simpleExpCounter++;
		}
	}

	if (simpleExpCounter == parsed.length) return false;

	var nodes = this.search(this.document, parsed), item;
	for (i = 0; item = nodes[i++];){
		if (item === node) return true;
	}
	return false;
};

local.matchPseudo = function(node, name, argument){
	var pseudoName = 'pseudo:' + name;
	if (this[pseudoName]) return this[pseudoName](node, argument);
	var attribute = this.getAttribute(node, name);
	return (argument) ? argument == attribute : !!attribute;
};

local.matchSelector = function(node, tag, id, classes, attributes, pseudos){
	if (tag){
		var nodeName = (this.isXMLDocument) ? node.nodeName : node.nodeName.toUpperCase();
		if (tag == '*'){
			if (nodeName < '@') return false; // Fix for comment nodes and closed nodes
		} else {
			if (nodeName != tag) return false;
		}
	}

	if (id && node.getAttribute('id') != id) return false;

	var i, part, cls;
	if (classes) for (i = classes.length; i--;){
		cls = node.getAttribute('class') || node.className;
		if (!(cls && classes[i].regexp.test(cls))) return false;
	}
	if (attributes) for (i = attributes.length; i--;){
		part = attributes[i];
		if (part.operator ? !part.test(this.getAttribute(node, part.key)) : !this.hasAttribute(node, part.key)) return false;
	}
	if (pseudos) for (i = pseudos.length; i--;){
		part = pseudos[i];
		if (!this.matchPseudo(node, part.key, part.value)) return false;
	}
	return true;
};

var combinators = {

	' ': function(node, tag, id, classes, attributes, pseudos, classList){ // all child nodes, any level

		var i, item, children;

		if (this.isHTMLDocument){
			getById: if (id){
				item = this.document.getElementById(id);
				if ((!item && node.all) || (this.idGetsName && item && item.getAttributeNode('id').nodeValue != id)){
					// all[id] returns all the elements with that name or id inside node
					// if theres just one it will return the element, else it will be a collection
					children = node.all[id];
					if (!children) return;
					if (!children[0]) children = [children];
					for (i = 0; item = children[i++];){
						var idNode = item.getAttributeNode('id');
						if (idNode && idNode.nodeValue == id){
							this.push(item, tag, null, classes, attributes, pseudos);
							break;
						}
					}
					return;
				}
				if (!item){
					// if the context is in the dom we return, else we will try GEBTN, breaking the getById label
					if (this.contains(this.root, node)) return;
					else break getById;
				} else if (this.document !== node && !this.contains(node, item)) return;
				this.push(item, tag, null, classes, attributes, pseudos);
				return;
			}
			getByClass: if (classes && node.getElementsByClassName && !this.brokenGEBCN){
				children = node.getElementsByClassName(classList.join(' '));
				if (!(children && children.length)) break getByClass;
				for (i = 0; item = children[i++];) this.push(item, tag, id, null, attributes, pseudos);
				return;
			}
		}
		getByTag: {
			children = node.getElementsByTagName(tag);
			if (!(children && children.length)) break getByTag;
			if (!this.brokenStarGEBTN) tag = null;
			for (i = 0; item = children[i++];) this.push(item, tag, id, classes, attributes, pseudos);
		}
	},

	'>': function(node, tag, id, classes, attributes, pseudos){ // direct children
		if ((node = node.firstChild)) do {
			if (node.nodeType == 1) this.push(node, tag, id, classes, attributes, pseudos);
		} while ((node = node.nextSibling));
	},

	'+': function(node, tag, id, classes, attributes, pseudos){ // next sibling
		while ((node = node.nextSibling)) if (node.nodeType == 1){
			this.push(node, tag, id, classes, attributes, pseudos);
			break;
		}
	},

	'^': function(node, tag, id, classes, attributes, pseudos){ // first child
		node = node.firstChild;
		if (node){
			if (node.nodeType == 1) this.push(node, tag, id, classes, attributes, pseudos);
			else this['combinator:+'](node, tag, id, classes, attributes, pseudos);
		}
	},

	'~': function(node, tag, id, classes, attributes, pseudos){ // next siblings
		while ((node = node.nextSibling)){
			if (node.nodeType != 1) continue;
			var uid = this.getUID(node);
			if (this.bitUniques[uid]) break;
			this.bitUniques[uid] = true;
			this.push(node, tag, id, classes, attributes, pseudos);
		}
	},

	'++': function(node, tag, id, classes, attributes, pseudos){ // next sibling and previous sibling
		this['combinator:+'](node, tag, id, classes, attributes, pseudos);
		this['combinator:!+'](node, tag, id, classes, attributes, pseudos);
	},

	'~~': function(node, tag, id, classes, attributes, pseudos){ // next siblings and previous siblings
		this['combinator:~'](node, tag, id, classes, attributes, pseudos);
		this['combinator:!~'](node, tag, id, classes, attributes, pseudos);
	},

	'!': function(node, tag, id, classes, attributes, pseudos){ // all parent nodes up to document
		while ((node = node.parentNode)) if (node !== this.document) this.push(node, tag, id, classes, attributes, pseudos);
	},

	'!>': function(node, tag, id, classes, attributes, pseudos){ // direct parent (one level)
		node = node.parentNode;
		if (node !== this.document) this.push(node, tag, id, classes, attributes, pseudos);
	},

	'!+': function(node, tag, id, classes, attributes, pseudos){ // previous sibling
		while ((node = node.previousSibling)) if (node.nodeType == 1){
			this.push(node, tag, id, classes, attributes, pseudos);
			break;
		}
	},

	'!^': function(node, tag, id, classes, attributes, pseudos){ // last child
		node = node.lastChild;
		if (node){
			if (node.nodeType == 1) this.push(node, tag, id, classes, attributes, pseudos);
			else this['combinator:!+'](node, tag, id, classes, attributes, pseudos);
		}
	},

	'!~': function(node, tag, id, classes, attributes, pseudos){ // previous siblings
		while ((node = node.previousSibling)){
			if (node.nodeType != 1) continue;
			var uid = this.getUID(node);
			if (this.bitUniques[uid]) break;
			this.bitUniques[uid] = true;
			this.push(node, tag, id, classes, attributes, pseudos);
		}
	}

};

for (var c in combinators) local['combinator:' + c] = combinators[c];

var pseudos = {

	/*<pseudo-selectors>*/

	'empty': function(node){
		var child = node.firstChild;
		return !(child && child.nodeType == 1) && !(node.innerText || node.textContent || '').length;
	},

	'not': function(node, expression){
		return !this.matchNode(node, expression);
	},

	'contains': function(node, text){
		return (node.innerText || node.textContent || '').indexOf(text) > -1;
	},

	'first-child': function(node){
		while ((node = node.previousSibling)) if (node.nodeType == 1) return false;
		return true;
	},

	'last-child': function(node){
		while ((node = node.nextSibling)) if (node.nodeType == 1) return false;
		return true;
	},

	'only-child': function(node){
		var prev = node;
		while ((prev = prev.previousSibling)) if (prev.nodeType == 1) return false;
		var next = node;
		while ((next = next.nextSibling)) if (next.nodeType == 1) return false;
		return true;
	},

	/*<nth-pseudo-selectors>*/

	'nth-child': local.createNTHPseudo('firstChild', 'nextSibling', 'posNTH'),

	'nth-last-child': local.createNTHPseudo('lastChild', 'previousSibling', 'posNTHLast'),

	'nth-of-type': local.createNTHPseudo('firstChild', 'nextSibling', 'posNTHType', true),

	'nth-last-of-type': local.createNTHPseudo('lastChild', 'previousSibling', 'posNTHTypeLast', true),

	'index': function(node, index){
		return this['pseudo:nth-child'](node, '' + index + 1);
	},

	'even': function(node){
		return this['pseudo:nth-child'](node, '2n');
	},

	'odd': function(node){
		return this['pseudo:nth-child'](node, '2n+1');
	},

	/*</nth-pseudo-selectors>*/

	/*<of-type-pseudo-selectors>*/

	'first-of-type': function(node){
		var nodeName = node.nodeName;
		while ((node = node.previousSibling)) if (node.nodeName == nodeName) return false;
		return true;
	},

	'last-of-type': function(node){
		var nodeName = node.nodeName;
		while ((node = node.nextSibling)) if (node.nodeName == nodeName) return false;
		return true;
	},

	'only-of-type': function(node){
		var prev = node, nodeName = node.nodeName;
		while ((prev = prev.previousSibling)) if (prev.nodeName == nodeName) return false;
		var next = node;
		while ((next = next.nextSibling)) if (next.nodeName == nodeName) return false;
		return true;
	},

	/*</of-type-pseudo-selectors>*/

	// custom pseudos

	'enabled': function(node){
		return !node.disabled;
	},

	'disabled': function(node){
		return node.disabled;
	},

	'checked': function(node){
		return node.checked || node.selected;
	},

	'focus': function(node){
		return this.isHTMLDocument && this.document.activeElement === node && (node.href || node.type || this.hasAttribute(node, 'tabindex'));
	},

	'root': function(node){
		return (node === this.root);
	},

	'selected': function(node){
		return node.selected;
	}

	/*</pseudo-selectors>*/
};

for (var p in pseudos) local['pseudo:' + p] = pseudos[p];

// attributes methods

var attributeGetters = local.attributeGetters = {

	'class': function(){
		return this.getAttribute('class') || this.className;
	},

	'for': function(){
		return ('htmlFor' in this) ? this.htmlFor : this.getAttribute('for');
	},

	'href': function(){
		return ('href' in this) ? this.getAttribute('href', 2) : this.getAttribute('href');
	},

	'style': function(){
		return (this.style) ? this.style.cssText : this.getAttribute('style');
	},

	'tabindex': function(){
		var attributeNode = this.getAttributeNode('tabindex');
		return (attributeNode && attributeNode.specified) ? attributeNode.nodeValue : null;
	},

	'type': function(){
		return this.getAttribute('type');
	},

	'maxlength': function(){
		var attributeNode = this.getAttributeNode('maxLength');
		return (attributeNode && attributeNode.specified) ? attributeNode.nodeValue : null;
	}

};

attributeGetters.MAXLENGTH = attributeGetters.maxLength = attributeGetters.maxlength;

// Slick

var Slick = local.Slick = (this.Slick || {});

Slick.version = '1.1.6';

// Slick finder

Slick.search = function(context, expression, append){
	return local.search(context, expression, append);
};

Slick.find = function(context, expression){
	return local.search(context, expression, null, true);
};

// Slick containment checker

Slick.contains = function(container, node){
	local.setDocument(container);
	return local.contains(container, node);
};

// Slick attribute getter

Slick.getAttribute = function(node, name){
	local.setDocument(node);
	return local.getAttribute(node, name);
};

Slick.hasAttribute = function(node, name){
	local.setDocument(node);
	return local.hasAttribute(node, name);
};

// Slick matcher

Slick.match = function(node, selector){
	if (!(node && selector)) return false;
	if (!selector || selector === node) return true;
	local.setDocument(node);
	return local.matchNode(node, selector);
};

// Slick attribute accessor

Slick.defineAttributeGetter = function(name, fn){
	local.attributeGetters[name] = fn;
	return this;
};

Slick.lookupAttributeGetter = function(name){
	return local.attributeGetters[name];
};

// Slick pseudo accessor

Slick.definePseudo = function(name, fn){
	local['pseudo:' + name] = function(node, argument){
		return fn.call(node, argument);
	};
	return this;
};

Slick.lookupPseudo = function(name){
	var pseudo = local['pseudo:' + name];
	if (pseudo) return function(argument){
		return pseudo.call(this, argument);
	};
	return null;
};

// Slick overrides accessor

Slick.override = function(regexp, fn){
	local.override(regexp, fn);
	return this;
};

Slick.isXML = local.isXML;

Slick.uidOf = function(node){
	return local.getUIDHTML(node);
};

if (!this.Slick) this.Slick = Slick;

}).apply(/*<CommonJS>*/(typeof exports != 'undefined') ? exports : /*</CommonJS>*/this);


/*
---

name: Element

description: One of the most important items in MooTools. Contains the dollar function, the dollars function, and an handful of cross-browser, time-saver methods to let you easily work with HTML Elements.

license: MIT-style license.

requires: [Window, Document, Array, String, Function, Object, Number, Slick.Parser, Slick.Finder]

provides: [Element, Elements, $, $$, Iframe, Selectors]

...
*/

var Element = function(tag, props){
	var konstructor = Element.Constructors[tag];
	if (konstructor) return konstructor(props);
	if (typeof tag != 'string') return document.id(tag).set(props);

	if (!props) props = {};

	if (!(/^[\w-]+$/).test(tag)){
		var parsed = Slick.parse(tag).expressions[0][0];
		tag = (parsed.tag == '*') ? 'div' : parsed.tag;
		if (parsed.id && props.id == null) props.id = parsed.id;

		var attributes = parsed.attributes;
		if (attributes) for (var attr, i = 0, l = attributes.length; i < l; i++){
			attr = attributes[i];
			if (props[attr.key] != null) continue;

			if (attr.value != null && attr.operator == '=') props[attr.key] = attr.value;
			else if (!attr.value && !attr.operator) props[attr.key] = true;
		}

		if (parsed.classList && props['class'] == null) props['class'] = parsed.classList.join(' ');
	}

	return document.newElement(tag, props);
};

if (Browser.Element) Element.prototype = Browser.Element.prototype;

new Type('Element', Element).mirror(function(name){
	if (Array.prototype[name]) return;

	var obj = {};
	obj[name] = function(){
		var results = [], args = arguments, elements = true;
		for (var i = 0, l = this.length; i < l; i++){
			var element = this[i], result = results[i] = element[name].apply(element, args);
			elements = (elements && typeOf(result) == 'element');
		}
		return (elements) ? new Elements(results) : results;
	};

	Elements.implement(obj);
});

if (!Browser.Element){
	Element.parent = Object;

	Element.Prototype = {'$family': Function.from('element').hide()};

	Element.mirror(function(name, method){
		Element.Prototype[name] = method;
	});
}

Element.Constructors = {};

//<1.2compat>

Element.Constructors = new Hash;

//</1.2compat>

var IFrame = new Type('IFrame', function(){
	var params = Array.link(arguments, {
		properties: Type.isObject,
		iframe: function(obj){
			return (obj != null);
		}
	});

	var props = params.properties || {}, iframe;
	if (params.iframe) iframe = document.id(params.iframe);
	var onload = props.onload || function(){};
	delete props.onload;
	props.id = props.name = [props.id, props.name, iframe ? (iframe.id || iframe.name) : 'IFrame_' + String.uniqueID()].pick();
	iframe = new Element(iframe || 'iframe', props);

	var onLoad = function(){
		onload.call(iframe.contentWindow);
	};

	if (window.frames[props.id]) onLoad();
	else iframe.addListener('load', onLoad);
	return iframe;
});

var Elements = this.Elements = function(nodes){
	if (nodes && nodes.length){
		var uniques = {}, node;
		for (var i = 0; node = nodes[i++];){
			var uid = Slick.uidOf(node);
			if (!uniques[uid]){
				uniques[uid] = true;
				this.push(node);
			}
		}
	}
};

Elements.prototype = {length: 0};
Elements.parent = Array;

new Type('Elements', Elements).implement({

	filter: function(filter, bind){
		if (!filter) return this;
		return new Elements(Array.filter(this, (typeOf(filter) == 'string') ? function(item){
			return item.match(filter);
		} : filter, bind));
	}.protect(),

	push: function(){
		var length = this.length;
		for (var i = 0, l = arguments.length; i < l; i++){
			var item = document.id(arguments[i]);
			if (item) this[length++] = item;
		}
		return (this.length = length);
	}.protect(),

	unshift: function(){
		var items = [];
		for (var i = 0, l = arguments.length; i < l; i++){
			var item = document.id(arguments[i]);
			if (item) items.push(item);
		}
		return Array.prototype.unshift.apply(this, items);
	}.protect(),

	concat: function(){
		var newElements = new Elements(this);
		for (var i = 0, l = arguments.length; i < l; i++){
			var item = arguments[i];
			if (Type.isEnumerable(item)) newElements.append(item);
			else newElements.push(item);
		}
		return newElements;
	}.protect(),

	append: function(collection){
		for (var i = 0, l = collection.length; i < l; i++) this.push(collection[i]);
		return this;
	}.protect(),

	empty: function(){
		while (this.length) delete this[--this.length];
		return this;
	}.protect()

});

//<1.2compat>

Elements.alias('extend', 'append');

//</1.2compat>

(function(){

// FF, IE
var splice = Array.prototype.splice, object = {'0': 0, '1': 1, length: 2};

splice.call(object, 1, 1);
if (object[1] == 1) Elements.implement('splice', function(){
	var length = this.length;
	var result = splice.apply(this, arguments);
	while (length >= this.length) delete this[length--];
	return result;
}.protect());

Elements.implement(Array.prototype);

Array.mirror(Elements);

/*<ltIE8>*/
var createElementAcceptsHTML;
try {
	var x = document.createElement('<input name=x>');
	createElementAcceptsHTML = (x.name == 'x');
} catch(e){}

var escapeQuotes = function(html){
	return ('' + html).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
};
/*</ltIE8>*/

Document.implement({

	newElement: function(tag, props){
		if (props && props.checked != null) props.defaultChecked = props.checked;
		/*<ltIE8>*/// Fix for readonly name and type properties in IE < 8
		if (createElementAcceptsHTML && props){
			tag = '<' + tag;
			if (props.name) tag += ' name="' + escapeQuotes(props.name) + '"';
			if (props.type) tag += ' type="' + escapeQuotes(props.type) + '"';
			tag += '>';
			delete props.name;
			delete props.type;
		}
		/*</ltIE8>*/
		return this.id(this.createElement(tag)).set(props);
	}

});

})();

Document.implement({

	newTextNode: function(text){
		return this.createTextNode(text);
	},

	getDocument: function(){
		return this;
	},

	getWindow: function(){
		return this.window;
	},

	id: (function(){

		var types = {

			string: function(id, nocash, doc){
				id = Slick.find(doc, '#' + id.replace(/(\W)/g, '\\$1'));
				return (id) ? types.element(id, nocash) : null;
			},

			element: function(el, nocash){
				$uid(el);
				if (!nocash && !el.$family && !(/^(?:object|embed)$/i).test(el.tagName)){
					Object.append(el, Element.Prototype);
				}
				return el;
			},

			object: function(obj, nocash, doc){
				if (obj.toElement) return types.element(obj.toElement(doc), nocash);
				return null;
			}

		};

		types.textnode = types.whitespace = types.window = types.document = function(zero){
			return zero;
		};

		return function(el, nocash, doc){
			if (el && el.$family && el.uid) return el;
			var type = typeOf(el);
			return (types[type]) ? types[type](el, nocash, doc || document) : null;
		};

	})()

});

if (window.$ == null) Window.implement('$', function(el, nc){
	return document.id(el, nc, this.document);
});

Window.implement({

	getDocument: function(){
		return this.document;
	},

	getWindow: function(){
		return this;
	}

});

[Document, Element].invoke('implement', {

	getElements: function(expression){
		return Slick.search(this, expression, new Elements);
	},

	getElement: function(expression){
		return document.id(Slick.find(this, expression));
	}

});

var contains = {contains: function(element){
	return Slick.contains(this, element);
}};

if (!document.contains) Document.implement(contains);
if (!document.createElement('div').contains) Element.implement(contains);

//<1.2compat>

Element.implement('hasChild', function(element){
	return this !== element && this.contains(element);
});

(function(search, find, match){

	this.Selectors = {};
	var pseudos = this.Selectors.Pseudo = new Hash();

	var addSlickPseudos = function(){
		for (var name in pseudos) if (pseudos.hasOwnProperty(name)){
			Slick.definePseudo(name, pseudos[name]);
			delete pseudos[name];
		}
	};

	Slick.search = function(context, expression, append){
		addSlickPseudos();
		return search.call(this, context, expression, append);
	};

	Slick.find = function(context, expression){
		addSlickPseudos();
		return find.call(this, context, expression);
	};

	Slick.match = function(node, selector){
		addSlickPseudos();
		return match.call(this, node, selector);
	};

})(Slick.search, Slick.find, Slick.match);

//</1.2compat>

// tree walking

var injectCombinator = function(expression, combinator){
	if (!expression) return combinator;

	expression = Object.clone(Slick.parse(expression));

	var expressions = expression.expressions;
	for (var i = expressions.length; i--;)
		expressions[i][0].combinator = combinator;

	return expression;
};

Object.forEach({
	getNext: '~',
	getPrevious: '!~',
	getParent: '!'
}, function(combinator, method){
	Element.implement(method, function(expression){
		return this.getElement(injectCombinator(expression, combinator));
	});
});

Object.forEach({
	getAllNext: '~',
	getAllPrevious: '!~',
	getSiblings: '~~',
	getChildren: '>',
	getParents: '!'
}, function(combinator, method){
	Element.implement(method, function(expression){
		return this.getElements(injectCombinator(expression, combinator));
	});
});

Element.implement({

	getFirst: function(expression){
		return document.id(Slick.search(this, injectCombinator(expression, '>'))[0]);
	},

	getLast: function(expression){
		return document.id(Slick.search(this, injectCombinator(expression, '>')).getLast());
	},

	getWindow: function(){
		return this.ownerDocument.window;
	},

	getDocument: function(){
		return this.ownerDocument;
	},

	getElementById: function(id){
		return document.id(Slick.find(this, '#' + ('' + id).replace(/(\W)/g, '\\$1')));
	},

	match: function(expression){
		return !expression || Slick.match(this, expression);
	}

});

//<1.2compat>

if (window.$$ == null) Window.implement('$$', function(selector){
	var elements = new Elements;
	if (arguments.length == 1 && typeof selector == 'string') return Slick.search(this.document, selector, elements);
	var args = Array.flatten(arguments);
	for (var i = 0, l = args.length; i < l; i++){
		var item = args[i];
		switch (typeOf(item)){
			case 'element': elements.push(item); break;
			case 'string': Slick.search(this.document, item, elements);
		}
	}
	return elements;
});

//</1.2compat>

if (window.$$ == null) Window.implement('$$', function(selector){
	if (arguments.length == 1){
		if (typeof selector == 'string') return Slick.search(this.document, selector, new Elements);
		else if (Type.isEnumerable(selector)) return new Elements(selector);
	}
	return new Elements(arguments);
});

(function(){

// Inserters

var inserters = {

	before: function(context, element){
		var parent = element.parentNode;
		if (parent) parent.insertBefore(context, element);
	},

	after: function(context, element){
		var parent = element.parentNode;
		if (parent) parent.insertBefore(context, element.nextSibling);
	},

	bottom: function(context, element){
		element.appendChild(context);
	},

	top: function(context, element){
		element.insertBefore(context, element.firstChild);
	}

};

inserters.inside = inserters.bottom;

//<1.2compat>

Object.each(inserters, function(inserter, where){

	where = where.capitalize();

	var methods = {};

	methods['inject' + where] = function(el){
		inserter(this, document.id(el, true));
		return this;
	};

	methods['grab' + where] = function(el){
		inserter(document.id(el, true), this);
		return this;
	};

	Element.implement(methods);

});

//</1.2compat>

// getProperty / setProperty

var propertyGetters = {}, propertySetters = {};

// properties

var properties = {};
Array.forEach([
	'type', 'value', 'defaultValue', 'accessKey', 'cellPadding', 'cellSpacing', 'colSpan',
	'frameBorder', 'readOnly', 'rowSpan', 'tabIndex', 'useMap'
], function(property){
	properties[property.toLowerCase()] = property;
});

Object.append(properties, {
	'html': 'innerHTML',
	'text': (function(){
		var temp = document.createElement('div');
		return (temp.textContent == null) ? 'innerText': 'textContent';
	})()
});

Object.forEach(properties, function(real, key){
	propertySetters[key] = function(node, value){
		node[real] = value;
	};
	propertyGetters[key] = function(node){
		return node[real];
	};
});

// Booleans

var bools = [
	'compact', 'nowrap', 'ismap', 'declare', 'noshade', 'checked',
	'disabled', 'readOnly', 'multiple', 'selected', 'noresize',
	'defer', 'defaultChecked', 'autofocus', 'controls', 'autoplay',
	'loop'
];

var booleans = {};
Array.forEach(bools, function(bool){
	var lower = bool.toLowerCase();
	booleans[lower] = bool;
	propertySetters[lower] = function(node, value){
		node[bool] = !!value;
	};
	propertyGetters[lower] = function(node){
		return !!node[bool];
	};
});

// Special cases

Object.append(propertySetters, {

	'class': function(node, value){
		('className' in node) ? node.className = value : node.setAttribute('class', value);
	},

	'for': function(node, value){
		('htmlFor' in node) ? node.htmlFor = value : node.setAttribute('for', value);
	},

	'style': function(node, value){
		(node.style) ? node.style.cssText = value : node.setAttribute('style', value);
	}

});

/* getProperty, setProperty */

Element.implement({

	setProperty: function(name, value){
		var lower = name.toLowerCase();
		if (value == null){
			if (!booleans[lower]){
				this.removeAttribute(name);
				return this;
			}
			value = false;
		}
		var setter = propertySetters[lower];
		if (setter) setter(this, value);
		else this.setAttribute(name, value);
		return this;
	},

	setProperties: function(attributes){
		for (var attribute in attributes) this.setProperty(attribute, attributes[attribute]);
		return this;
	},

	getProperty: function(name){
		var getter = propertyGetters[name.toLowerCase()];
		if (getter) return getter(this);
		var result = Slick.getAttribute(this, name);
		return (!result && !Slick.hasAttribute(this, name)) ? null : result;
	},

	getProperties: function(){
		var args = Array.from(arguments);
		return args.map(this.getProperty, this).associate(args);
	},

	removeProperty: function(name){
		return this.setProperty(name, null);
	},

	removeProperties: function(){
		Array.each(arguments, this.removeProperty, this);
		return this;
	},

	set: function(prop, value){
		var property = Element.Properties[prop];
		(property && property.set) ? property.set.call(this, value) : this.setProperty(prop, value);
	}.overloadSetter(),

	get: function(prop){
		var property = Element.Properties[prop];
		return (property && property.get) ? property.get.apply(this) : this.getProperty(prop);
	}.overloadGetter(),

	erase: function(prop){
		var property = Element.Properties[prop];
		(property && property.erase) ? property.erase.apply(this) : this.removeProperty(prop);
		return this;
	},

	hasClass: function(className){
		return this.className.clean().contains(className, ' ');
	},

	addClass: function(className){
		if (!this.hasClass(className)) this.className = (this.className + ' ' + className).clean();
		return this;
	},

	removeClass: function(className){
		this.className = this.className.replace(new RegExp('(^|\\s)' + className + '(?:\\s|$)'), '$1');
		return this;
	},

	toggleClass: function(className, force){
		if (force == null) force = !this.hasClass(className);
		return (force) ? this.addClass(className) : this.removeClass(className);
	},

	adopt: function(){
		var parent = this, fragment, elements = Array.flatten(arguments), length = elements.length;
		if (length > 1) parent = fragment = document.createDocumentFragment();

		for (var i = 0; i < length; i++){
			var element = document.id(elements[i], true);
			if (element) parent.appendChild(element);
		}

		if (fragment) this.appendChild(fragment);

		return this;
	},

	appendText: function(text, where){
		return this.grab(this.getDocument().newTextNode(text), where);
	},

	grab: function(el, where){
		inserters[where || 'bottom'](document.id(el, true), this);
		return this;
	},

	inject: function(el, where){
		inserters[where || 'bottom'](this, document.id(el, true));
		return this;
	},

	replaces: function(el){
		el = document.id(el, true);
		el.parentNode.replaceChild(this, el);
		return this;
	},

	wraps: function(el, where){
		el = document.id(el, true);
		return this.replaces(el).grab(el, where);
	},

	getSelected: function(){
		this.selectedIndex; // Safari 3.2.1
		return new Elements(Array.from(this.options).filter(function(option){
			return option.selected;
		}));
	},

	toQueryString: function(){
		var queryString = [];
		this.getElements('input, select, textarea').each(function(el){
			var type = el.type;
			if (!el.name || el.disabled || type == 'submit' || type == 'reset' || type == 'file' || type == 'image') return;

			var value = (el.get('tag') == 'select') ? el.getSelected().map(function(opt){
				// IE
				return document.id(opt).get('value');
			}) : ((type == 'radio' || type == 'checkbox') && !el.checked) ? null : el.get('value');

			Array.from(value).each(function(val){
				if (typeof val != 'undefined') queryString.push(encodeURIComponent(el.name) + '=' + encodeURIComponent(val));
			});
		});
		return queryString.join('&');
	}

});

var collected = {}, storage = {};

var get = function(uid){
	return (storage[uid] || (storage[uid] = {}));
};

var clean = function(item){
	var uid = item.uid;
	if (item.removeEvents) item.removeEvents();
	if (item.clearAttributes) item.clearAttributes();
	if (uid != null){
		delete collected[uid];
		delete storage[uid];
	}
	return item;
};

var formProps = {input: 'checked', option: 'selected', textarea: 'value'};

Element.implement({

	destroy: function(){
		var children = clean(this).getElementsByTagName('*');
		Array.each(children, clean);
		Element.dispose(this);
		return null;
	},

	empty: function(){
		Array.from(this.childNodes).each(Element.dispose);
		return this;
	},

	dispose: function(){
		return (this.parentNode) ? this.parentNode.removeChild(this) : this;
	},

	clone: function(contents, keepid){
		contents = contents !== false;
		var clone = this.cloneNode(contents), ce = [clone], te = [this], i;

		if (contents){
			ce.append(Array.from(clone.getElementsByTagName('*')));
			te.append(Array.from(this.getElementsByTagName('*')));
		}

		for (i = ce.length; i--;){
			var node = ce[i], element = te[i];
			if (!keepid) node.removeAttribute('id');
			/*<ltIE9>*/
			if (node.clearAttributes){
				node.clearAttributes();
				node.mergeAttributes(element);
				node.removeAttribute('uid');
				if (node.options){
					var no = node.options, eo = element.options;
					for (var j = no.length; j--;) no[j].selected = eo[j].selected;
				}
			}
			/*</ltIE9>*/
			var prop = formProps[element.tagName.toLowerCase()];
			if (prop && element[prop]) node[prop] = element[prop];
		}

		/*<ltIE9>*/
		if (Browser.ie){
			var co = clone.getElementsByTagName('object'), to = this.getElementsByTagName('object');
			for (i = co.length; i--;) co[i].outerHTML = to[i].outerHTML;
		}
		/*</ltIE9>*/
		return document.id(clone);
	}

});

[Element, Window, Document].invoke('implement', {

	addListener: function(type, fn){
		if (type == 'unload'){
			var old = fn, self = this;
			fn = function(){
				self.removeListener('unload', fn);
				old();
			};
		} else {
			collected[$uid(this)] = this;
		}
		if (this.addEventListener) this.addEventListener(type, fn, !!arguments[2]);
		else this.attachEvent('on' + type, fn);
		return this;
	},

	removeListener: function(type, fn){
		if (this.removeEventListener) this.removeEventListener(type, fn, !!arguments[2]);
		else this.detachEvent('on' + type, fn);
		return this;
	},

	retrieve: function(property, dflt){
		var storage = get($uid(this)), prop = storage[property];
		if (dflt != null && prop == null) prop = storage[property] = dflt;
		return prop != null ? prop : null;
	},

	store: function(property, value){
		var storage = get($uid(this));
		storage[property] = value;
		return this;
	},

	eliminate: function(property){
		var storage = get($uid(this));
		delete storage[property];
		return this;
	}

});

/*<ltIE9>*/
if (window.attachEvent && !window.addEventListener) window.addListener('unload', function(){
	Object.each(collected, clean);
	if (window.CollectGarbage) CollectGarbage();
});
/*</ltIE9>*/

Element.Properties = {};

//<1.2compat>

Element.Properties = new Hash;

//</1.2compat>

Element.Properties.style = {

	set: function(style){
		this.style.cssText = style;
	},

	get: function(){
		return this.style.cssText;
	},

	erase: function(){
		this.style.cssText = '';
	}

};

Element.Properties.tag = {

	get: function(){
		return this.tagName.toLowerCase();
	}

};

/*<!webkit>*/
Element.Properties.html = (function(){

	var tableTest = Function.attempt(function(){
		var table = document.createElement('table');
		table.innerHTML = '<tr><td></td></tr>';
	});

	var wrapper = document.createElement('div');

	var translations = {
		table: [1, '<table>', '</table>'],
		select: [1, '<select>', '</select>'],
		tbody: [2, '<table><tbody>', '</tbody></table>'],
		tr: [3, '<table><tbody><tr>', '</tr></tbody></table>']
	};
	translations.thead = translations.tfoot = translations.tbody;

	/*<ltIE9>*/
	// technique by jdbarlett - http://jdbartlett.com/innershiv/
	wrapper.innerHTML = '<nav></nav>';
	var HTML5Test = wrapper.childNodes.length == 1;
	if (!HTML5Test){
		var tags = 'abbr article aside audio canvas datalist details figcaption figure footer header hgroup mark meter nav output progress section summary time video'.split(' '),
			fragment = document.createDocumentFragment(), l = tags.length;
		while (l--) fragment.createElement(tags[l]);
		fragment.appendChild(wrapper);
	}
	/*</ltIE9>*/

	var html = {
		set: function(html){
			if (typeOf(html) == 'array') html = html.join('');

			var wrap = (!tableTest && translations[this.get('tag')]);
			/*<ltIE9>*/
			if (!wrap && !HTML5Test) wrap = [0, '', ''];
			/*</ltIE9>*/
			if (wrap){
				var first = wrapper;
				first.innerHTML = wrap[1] + html + wrap[2];
				for (var i = wrap[0]; i--;) first = first.firstChild;
				this.empty().adopt(first.childNodes);
			} else {
				this.innerHTML = html;
			}
		}
	};

	html.erase = html.set;

	return html;
})();
/*</!webkit>*/

/*<ltIE9>*/
var testForm = document.createElement('form');
testForm.innerHTML = '<select><option>s</option></select>';

if (testForm.firstChild.value != 's') Element.Properties.value = {

	set: function(value){
		var tag = this.get('tag');
		if (tag != 'select') return this.setProperty('value', value);
		var options = this.getElements('option');
		for (var i = 0; i < options.length; i++){
			var option = options[i],
				attr = option.getAttributeNode('value'),
				optionValue = (attr && attr.specified) ? option.value : option.get('text');
			if (optionValue == value) return option.selected = true;
		}
	},

	get: function(){
		var option = this, tag = option.get('tag');

		if (tag != 'select' && tag != 'option') return this.getProperty('value');

		if (tag == 'select' && !(option = option.getSelected()[0])) return '';

		var attr = option.getAttributeNode('value');
		return (attr && attr.specified) ? option.value : option.get('text');
	}

};
/*</ltIE9>*/

})();


/*
---

name: Event

description: Contains the Event Type, to make the event object cross-browser.

license: MIT-style license.

requires: [Window, Document, Array, Function, String, Object]

provides: Event

...
*/

(function() {

var _keys = {};

var DOMEvent = this.DOMEvent = new Type('DOMEvent', function(event, win){
	if (!win) win = window;
	event = event || win.event;
	if (event.$extended) return event;
	this.event = event;
	this.$extended = true;
	this.shift = event.shiftKey;
	this.control = event.ctrlKey;
	this.alt = event.altKey;
	this.meta = event.metaKey;
	var type = this.type = event.type;
	var target = event.target || event.srcElement;
	while (target && target.nodeType == 3) target = target.parentNode;
	this.target = document.id(target);

	if (type.indexOf('key') == 0){
		var code = this.code = (event.which || event.keyCode);
		this.key = _keys[code]/*<1.3compat>*/ || Object.keyOf(Event.Keys, code)/*</1.3compat>*/;
		if (type == 'keydown'){
			if (code > 111 && code < 124) this.key = 'f' + (code - 111);
			else if (code > 95 && code < 106) this.key = code - 96;
		}
		if (this.key == null) this.key = String.fromCharCode(code).toLowerCase();
	} else if (type == 'click' || type == 'dblclick' || type == 'contextmenu' || type == 'DOMMouseScroll' || type.indexOf('mouse') == 0){
		var doc = win.document;
		doc = (!doc.compatMode || doc.compatMode == 'CSS1Compat') ? doc.html : doc.body;
		this.page = {
			x: (event.pageX != null) ? event.pageX : event.clientX + doc.scrollLeft,
			y: (event.pageY != null) ? event.pageY : event.clientY + doc.scrollTop
		};
		this.client = {
			x: (event.pageX != null) ? event.pageX - win.pageXOffset : event.clientX,
			y: (event.pageY != null) ? event.pageY - win.pageYOffset : event.clientY
		};
		if (type == 'DOMMouseScroll' || type == 'mousewheel')
			this.wheel = (event.wheelDelta) ? event.wheelDelta / 120 : -(event.detail || 0) / 3;

		this.rightClick = (event.which == 3 || event.button == 2);
		if (type == 'mouseover' || type == 'mouseout'){
			var related = event.relatedTarget || event[(type == 'mouseover' ? 'from' : 'to') + 'Element'];
			while (related && related.nodeType == 3) related = related.parentNode;
			this.relatedTarget = document.id(related);
		}
	} else if (type.indexOf('touch') == 0 || type.indexOf('gesture') == 0){
		this.rotation = event.rotation;
		this.scale = event.scale;
		this.targetTouches = event.targetTouches;
		this.changedTouches = event.changedTouches;
		var touches = this.touches = event.touches;
		if (touches && touches[0]){
			var touch = touches[0];
			this.page = {x: touch.pageX, y: touch.pageY};
			this.client = {x: touch.clientX, y: touch.clientY};
		}
	}

	if (!this.client) this.client = {};
	if (!this.page) this.page = {};
});

DOMEvent.implement({

	stop: function(){
		return this.preventDefault().stopPropagation();
	},

	stopPropagation: function(){
		if (this.event.stopPropagation) this.event.stopPropagation();
		else this.event.cancelBubble = true;
		return this;
	},

	preventDefault: function(){
		if (this.event.preventDefault) this.event.preventDefault();
		else this.event.returnValue = false;
		return this;
	}

});

DOMEvent.defineKey = function(code, key){
	_keys[code] = key;
	return this;
};

DOMEvent.defineKeys = DOMEvent.defineKey.overloadSetter(true);

DOMEvent.defineKeys({
	'38': 'up', '40': 'down', '37': 'left', '39': 'right',
	'27': 'esc', '32': 'space', '8': 'backspace', '9': 'tab',
	'46': 'delete', '13': 'enter'
});

})();

/*<1.3compat>*/
var Event = DOMEvent;
Event.Keys = {};
/*</1.3compat>*/

/*<1.2compat>*/

Event.Keys = new Hash(Event.Keys);

/*</1.2compat>*/


/*
---

name: Element.Event

description: Contains Element methods for dealing with events. This file also includes mouseenter and mouseleave custom Element Events.

license: MIT-style license.

requires: [Element, Event]

provides: Element.Event

...
*/

(function(){

Element.Properties.events = {set: function(events){
	this.addEvents(events);
}};

[Element, Window, Document].invoke('implement', {

	addEvent: function(type, fn){
		var events = this.retrieve('events', {});
		if (!events[type]) events[type] = {keys: [], values: []};
		if (events[type].keys.contains(fn)) return this;
		events[type].keys.push(fn);
		var realType = type,
			custom = Element.Events[type],
			condition = fn,
			self = this;
		if (custom){
			if (custom.onAdd) custom.onAdd.call(this, fn, type);
			if (custom.condition){
				condition = function(event){
					if (custom.condition.call(this, event, type)) return fn.call(this, event);
					return true;
				};
			}
			if (custom.base) realType = Function.from(custom.base).call(this, type);
		}
		var defn = function(){
			return fn.call(self);
		};
		var nativeEvent = Element.NativeEvents[realType];
		if (nativeEvent){
			if (nativeEvent == 2){
				defn = function(event){
					event = new DOMEvent(event, self.getWindow());
					if (condition.call(self, event) === false) event.stop();
				};
			}
			this.addListener(realType, defn, arguments[2]);
		}
		events[type].values.push(defn);
		return this;
	},

	removeEvent: function(type, fn){
		var events = this.retrieve('events');
		if (!events || !events[type]) return this;
		var list = events[type];
		var index = list.keys.indexOf(fn);
		if (index == -1) return this;
		var value = list.values[index];
		delete list.keys[index];
		delete list.values[index];
		var custom = Element.Events[type];
		if (custom){
			if (custom.onRemove) custom.onRemove.call(this, fn, type);
			if (custom.base) type = Function.from(custom.base).call(this, type);
		}
		return (Element.NativeEvents[type]) ? this.removeListener(type, value, arguments[2]) : this;
	},

	addEvents: function(events){
		for (var event in events) this.addEvent(event, events[event]);
		return this;
	},

	removeEvents: function(events){
		var type;
		if (typeOf(events) == 'object'){
			for (type in events) this.removeEvent(type, events[type]);
			return this;
		}
		var attached = this.retrieve('events');
		if (!attached) return this;
		if (!events){
			for (type in attached) this.removeEvents(type);
			this.eliminate('events');
		} else if (attached[events]){
			attached[events].keys.each(function(fn){
				this.removeEvent(events, fn);
			}, this);
			delete attached[events];
		}
		return this;
	},

	fireEvent: function(type, args, delay){
		var events = this.retrieve('events');
		if (!events || !events[type]) return this;
		args = Array.from(args);

		events[type].keys.each(function(fn){
			if (delay) fn.delay(delay, this, args);
			else fn.apply(this, args);
		}, this);
		return this;
	},

	cloneEvents: function(from, type){
		from = document.id(from);
		var events = from.retrieve('events');
		if (!events) return this;
		if (!type){
			for (var eventType in events) this.cloneEvents(from, eventType);
		} else if (events[type]){
			events[type].keys.each(function(fn){
				this.addEvent(type, fn);
			}, this);
		}
		return this;
	}

});

Element.NativeEvents = {
	click: 2, dblclick: 2, mouseup: 2, mousedown: 2, contextmenu: 2, //mouse buttons
	mousewheel: 2, DOMMouseScroll: 2, //mouse wheel
	mouseover: 2, mouseout: 2, mousemove: 2, selectstart: 2, selectend: 2, //mouse movement
	keydown: 2, keypress: 2, keyup: 2, //keyboard
	orientationchange: 2, // mobile
	touchstart: 2, touchmove: 2, touchend: 2, touchcancel: 2, // touch
	gesturestart: 2, gesturechange: 2, gestureend: 2, // gesture
	focus: 2, blur: 2, change: 2, reset: 2, select: 2, submit: 2, paste: 2, input: 2, //form elements
	load: 2, unload: 1, beforeunload: 2, resize: 1, move: 1, DOMContentLoaded: 1, readystatechange: 1, //window
	error: 1, abort: 1, scroll: 1 //misc
};

var check = function(event){
	var related = event.relatedTarget;
	if (related == null) return true;
	if (!related) return false;
	return (related != this && related.prefix != 'xul' && typeOf(this) != 'document' && !this.contains(related));
};

Element.Events = {

	mouseenter: {
		base: 'mouseover',
		condition: check
	},

	mouseleave: {
		base: 'mouseout',
		condition: check
	},

	mousewheel: {
		base: (Browser.firefox) ? 'DOMMouseScroll' : 'mousewheel'
	}

};

/*<ltIE9>*/
if (!window.addEventListener){
	Element.NativeEvents.propertychange = 2;
	Element.Events.change = {
		base: function(){
			var type = this.type;
			return (this.get('tag') == 'input' && (type == 'radio' || type == 'checkbox')) ? 'propertychange' : 'change'
		},
		condition: function(event){
			return !!(this.type != 'radio' || this.checked);
		}
	}
}
/*</ltIE9>*/

//<1.2compat>

Element.Events = new Hash(Element.Events);

//</1.2compat>

})();


/*
---

name: DOMReady

description: Contains the custom event domready.

license: MIT-style license.

requires: [Browser, Element, Element.Event]

provides: [DOMReady, DomReady]

...
*/

(function(window, document){

var ready,
	loaded,
	checks = [],
	shouldPoll,
	timer,
	testElement = document.createElement('div');

var domready = function(){
	clearTimeout(timer);
	if (ready) return;
	Browser.loaded = ready = true;
	document.removeListener('DOMContentLoaded', domready).removeListener('readystatechange', check);

	document.fireEvent('domready');
	window.fireEvent('domready');
};

var check = function(){
	for (var i = checks.length; i--;) if (checks[i]()){
		domready();
		return true;
	}
	return false;
};

var poll = function(){
	clearTimeout(timer);
	if (!check()) timer = setTimeout(poll, 10);
};

document.addListener('DOMContentLoaded', domready);

/*<ltIE8>*/
// doScroll technique by Diego Perini http://javascript.nwbox.com/IEContentLoaded/
// testElement.doScroll() throws when the DOM is not ready, only in the top window
var doScrollWorks = function(){
	try {
		testElement.doScroll();
		return true;
	} catch (e){}
	return false;
};
// If doScroll works already, it can't be used to determine domready
//   e.g. in an iframe
if (testElement.doScroll && !doScrollWorks()){
	checks.push(doScrollWorks);
	shouldPoll = true;
}
/*</ltIE8>*/

if (document.readyState) checks.push(function(){
	var state = document.readyState;
	return (state == 'loaded' || state == 'complete');
});

if ('onreadystatechange' in document) document.addListener('readystatechange', check);
else shouldPoll = true;

if (shouldPoll) poll();

Element.Events.domready = {
	onAdd: function(fn){
		if (ready) fn.call(this);
	}
};

// Make sure that domready fires before load
Element.Events.load = {
	base: 'load',
	onAdd: function(fn){
		if (loaded && this == window) fn.call(this);
	},
	condition: function(){
		if (this == window){
			domready();
			delete Element.Events.load;
		}
		return true;
	}
};

// This is based on the custom load event
window.addEvent('load', function(){
	loaded = true;
});

})(window, document);


/*
---

script: More.js

name: More

description: MooTools More

license: MIT-style license

authors:
  - Guillermo Rauch
  - Thomas Aylott
  - Scott Kyle
  - Arian Stolwijk
  - Tim Wienk
  - Christoph Pojer
  - Aaron Newton
  - Jacob Thornton

requires:
  - Core/MooTools

provides: [MooTools.More]

...
*/

MooTools.More = {
	'version': '1.4.0.1',
	'build': 'a4244edf2aa97ac8a196fc96082dd35af1abab87'
};


/*
---

script: Assets.js

name: Assets

description: Provides methods to dynamically load JavaScript, CSS, and Image files into the document.

license: MIT-style license

authors:
  - Valerio Proietti

requires:
  - Core/Element.Event
  - /MooTools.More

provides: [Assets]

...
*/

var Asset = {

	javascript: function(source, properties){
		if (!properties) properties = {};

		var script = new Element('script', {src: source, type: 'text/javascript'}),
			doc = properties.document || document,
			load = properties.onload || properties.onLoad;

		delete properties.onload;
		delete properties.onLoad;
		delete properties.document;

		if (load){
			if (typeof script.onreadystatechange != 'undefined'){
				script.addEvent('readystatechange', function(){
					if (['loaded', 'complete'].contains(this.readyState)) load.call(this);
				});
			} else {
				script.addEvent('load', load);
			}
		}

		return script.set(properties).inject(doc.head);
	},

	css: function(source, properties){
		if (!properties) properties = {};

		var link = new Element('link', {
			rel: 'stylesheet',
			media: 'screen',
			type: 'text/css',
			href: source
		});

		var load = properties.onload || properties.onLoad,
			doc = properties.document || document;

		delete properties.onload;
		delete properties.onLoad;
		delete properties.document;

		if (load) link.addEvent('load', load);
		return link.set(properties).inject(doc.head);
	},

	image: function(source, properties){
		if (!properties) properties = {};

		var image = new Image(),
			element = document.id(image) || new Element('img');

		['load', 'abort', 'error'].each(function(name){
			var type = 'on' + name,
				cap = 'on' + name.capitalize(),
				event = properties[type] || properties[cap] || function(){};

			delete properties[cap];
			delete properties[type];

			image[type] = function(){
				if (!image) return;
				if (!element.parentNode){
					element.width = image.width;
					element.height = image.height;
				}
				image = image.onload = image.onabort = image.onerror = null;
				event.delay(1, element, element);
				element.fireEvent(name, element, 1);
			};
		});

		image.src = element.src = source;
		if (image && image.complete) image.onload.delay(1);
		return element.set(properties);
	},

	images: function(sources, options){
		sources = Array.from(sources);

		var fn = function(){},
			counter = 0;

		options = Object.merge({
			onComplete: fn,
			onProgress: fn,
			onError: fn,
			properties: {}
		}, options);

		return new Elements(sources.map(function(source, index){
			return Asset.image(source, Object.append(options.properties, {
				onload: function(){
					counter++;
					options.onProgress.call(this, counter, index, source);
					if (counter == sources.length) options.onComplete();
				},
				onerror: function(){
					counter++;
					options.onError.call(this, counter, index, source);
					if (counter == sources.length) options.onComplete();
				}
			}));
		}));
	}

};


/*
---

name: Class

description: Contains the Class Function for easily creating, extending, and implementing reusable Classes.

license: MIT-style license.

requires: [Array, String, Function, Number]

provides: Class

...
*/

(function(){

var Class = this.Class = new Type('Class', function(params){
	if (instanceOf(params, Function)) params = {initialize: params};

	var newClass = function(){
		reset(this);
		if (newClass.$prototyping) return this;
		this.$caller = null;
		var value = (this.initialize) ? this.initialize.apply(this, arguments) : this;
		this.$caller = this.caller = null;
		return value;
	}.extend(this).implement(params);

	newClass.$constructor = Class;
	newClass.prototype.$constructor = newClass;
	newClass.prototype.parent = parent;

	return newClass;
});

var parent = function(){
	if (!this.$caller) throw new Error('The method "parent" cannot be called.');
	var name = this.$caller.$name,
		parent = this.$caller.$owner.parent,
		previous = (parent) ? parent.prototype[name] : null;
	if (!previous) throw new Error('The method "' + name + '" has no parent.');
	return previous.apply(this, arguments);
};

var reset = function(object){
	for (var key in object){
		var value = object[key];
		switch (typeOf(value)){
			case 'object':
				var F = function(){};
				F.prototype = value;
				object[key] = reset(new F);
			break;
			case 'array': object[key] = value.clone(); break;
		}
	}
	return object;
};

var wrap = function(self, key, method){
	if (method.$origin) method = method.$origin;
	var wrapper = function(){
		if (method.$protected && this.$caller == null) throw new Error('The method "' + key + '" cannot be called.');
		var caller = this.caller, current = this.$caller;
		this.caller = current; this.$caller = wrapper;
		var result = method.apply(this, arguments);
		this.$caller = current; this.caller = caller;
		return result;
	}.extend({$owner: self, $origin: method, $name: key});
	return wrapper;
};

var implement = function(key, value, retain){
	if (Class.Mutators.hasOwnProperty(key)){
		value = Class.Mutators[key].call(this, value);
		if (value == null) return this;
	}

	if (typeOf(value) == 'function'){
		if (value.$hidden) return this;
		this.prototype[key] = (retain) ? value : wrap(this, key, value);
	} else {
		Object.merge(this.prototype, key, value);
	}

	return this;
};

var getInstance = function(klass){
	klass.$prototyping = true;
	var proto = new klass;
	delete klass.$prototyping;
	return proto;
};

Class.implement('implement', implement.overloadSetter());

Class.Mutators = {

	Extends: function(parent){
		this.parent = parent;
		this.prototype = getInstance(parent);
	},

	Implements: function(items){
		Array.from(items).each(function(item){
			var instance = new item;
			for (var key in instance) implement.call(this, key, instance[key], true);
		}, this);
	}
};

})();


/*
---

name: Class.Extras

description: Contains Utility Classes that can be implemented into your own Classes to ease the execution of many common tasks.

license: MIT-style license.

requires: Class

provides: [Class.Extras, Chain, Events, Options]

...
*/

(function(){

this.Chain = new Class({

	$chain: [],

	chain: function(){
		this.$chain.append(Array.flatten(arguments));
		return this;
	},

	callChain: function(){
		return (this.$chain.length) ? this.$chain.shift().apply(this, arguments) : false;
	},

	clearChain: function(){
		this.$chain.empty();
		return this;
	}

});

var removeOn = function(string){
	return string.replace(/^on([A-Z])/, function(full, first){
		return first.toLowerCase();
	});
};

this.Events = new Class({

	$events: {},

	addEvent: function(type, fn, internal){
		type = removeOn(type);

		/*<1.2compat>*/
		if (fn == $empty) return this;
		/*</1.2compat>*/

		this.$events[type] = (this.$events[type] || []).include(fn);
		if (internal) fn.internal = true;
		return this;
	},

	addEvents: function(events){
		for (var type in events) this.addEvent(type, events[type]);
		return this;
	},

	fireEvent: function(type, args, delay){
		type = removeOn(type);
		var events = this.$events[type];
		if (!events) return this;
		args = Array.from(args);
		events.each(function(fn){
			if (delay) fn.delay(delay, this, args);
			else fn.apply(this, args);
		}, this);
		return this;
	},

	removeEvent: function(type, fn){
		type = removeOn(type);
		var events = this.$events[type];
		if (events && !fn.internal){
			var index =  events.indexOf(fn);
			if (index != -1) delete events[index];
		}
		return this;
	},

	removeEvents: function(events){
		var type;
		if (typeOf(events) == 'object'){
			for (type in events) this.removeEvent(type, events[type]);
			return this;
		}
		if (events) events = removeOn(events);
		for (type in this.$events){
			if (events && events != type) continue;
			var fns = this.$events[type];
			for (var i = fns.length; i--;) if (i in fns){
				this.removeEvent(type, fns[i]);
			}
		}
		return this;
	}

});

this.Options = new Class({

	setOptions: function(){
		var options = this.options = Object.merge.apply(null, [{}, this.options].append(arguments));
		if (this.addEvent) for (var option in options){
			if (typeOf(options[option]) != 'function' || !(/^on[A-Z]/).test(option)) continue;
			this.addEvent(option, options[option]);
			delete options[option];
		}
		return this;
	}

});

})();


/*
---
name: Table
description: LUA-Style table implementation.
license: MIT-style license
authors:
  - Valerio Proietti
requires: [Core/Array]
provides: [Table]
...
*/

(function(){

var Table = this.Table = function(){

	this.length = 0;
	var keys = [],
	    values = [];
	
	this.set = function(key, value){
		var index = keys.indexOf(key);
		if (index == -1){
			var length = keys.length;
			keys[length] = key;
			values[length] = value;
			this.length++;
		} else {
			values[index] = value;
		}
		return this;
	};

	this.get = function(key){
		var index = keys.indexOf(key);
		return (index == -1) ? null : values[index];
	};

	this.erase = function(key){
		var index = keys.indexOf(key);
		if (index != -1){
			this.length--;
			keys.splice(index, 1);
			return values.splice(index, 1)[0];
		}
		return null;
	};

	this.each = this.forEach = function(fn, bind){
		for (var i = 0, l = this.length; i < l; i++) fn.call(bind, keys[i], values[i], this);
	};
	
};

if (this.Type) new Type('Table', Table);

})();


/*
---

name: JSON

description: JSON encoder and decoder.

license: MIT-style license.

SeeAlso: <http://www.json.org/>

requires: [Array, String, Number, Function]

provides: JSON

...
*/

if (typeof JSON == 'undefined') this.JSON = {};

//<1.2compat>

JSON = new Hash({
	stringify: JSON.stringify,
	parse: JSON.parse
});

//</1.2compat>

(function(){

var special = {'\b': '\\b', '\t': '\\t', '\n': '\\n', '\f': '\\f', '\r': '\\r', '"' : '\\"', '\\': '\\\\'};

var escape = function(chr){
	return special[chr] || '\\u' + ('0000' + chr.charCodeAt(0).toString(16)).slice(-4);
};

JSON.validate = function(string){
	string = string.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g, '@').
					replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']').
					replace(/(?:^|:|,)(?:\s*\[)+/g, '');

	return (/^[\],:{}\s]*$/).test(string);
};

JSON.encode = JSON.stringify ? function(obj){
	return JSON.stringify(obj);
} : function(obj){
	if (obj && obj.toJSON) obj = obj.toJSON();

	switch (typeOf(obj)){
		case 'string':
			return '"' + obj.replace(/[\x00-\x1f\\"]/g, escape) + '"';
		case 'array':
			return '[' + obj.map(JSON.encode).clean() + ']';
		case 'object': case 'hash':
			var string = [];
			Object.each(obj, function(value, key){
				var json = JSON.encode(value);
				if (json) string.push(JSON.encode(key) + ':' + json);
			});
			return '{' + string + '}';
		case 'number': case 'boolean': return '' + obj;
		case 'null': return 'null';
	}

	return null;
};

JSON.decode = function(string, secure){
	if (!string || typeOf(string) != 'string') return null;

	if (secure || JSON.secure){
		if (JSON.parse) return JSON.parse(string);
		if (!JSON.validate(string)) throw new Error('JSON could not decode the input; security is enabled and the value is not secure.');
	}

	return eval('(' + string + ')');
};

})();


/*
---
name: Element.Data
description: Stores data in HTML5 data properties
provides: [Element.Data]
requires: [Core/Element, Core/JSON]
script: Element.Data.js

...
*/
(function(){

	JSON.isSecure = function(string){
		//this verifies that the string is parsable JSON and not malicious (borrowed from JSON.js in MooTools, which in turn borrowed it from Crockford)
		//this version is a little more permissive, as it allows single quoted attributes because forcing the use of double quotes
		//is a pain when this stuff is used as HTML properties
		return (/^[,:{}\[\]0-9.\-+Eaeflnr-u \n\r\t]*$/).test(string.replace(/\\./g, '@').replace(/"[^"\\\n\r]*"/g, '').replace(/'[^'\\\n\r]*'/g, ''));
	};

	Element.implement({
		/*
			sets an HTML5 data property.
			arguments:
				name - (string) the data name to store; will be automatically prefixed with 'data-'.
				value - (string, number) the value to store.
		*/
		setData: function(name, value){
			return this.set('data-' + name.hyphenate(), value);
		},

		getData: function(name, defaultValue){
			var value = this.get('data-' + name.hyphenate());
			if (value != undefined){
				return value;
			} else if (defaultValue != undefined){
				this.setData(name, defaultValue);
				return defaultValue;
			}
		},

		/* 
			arguments:
				name - (string) the data name to store; will be automatically prefixed with 'data-'
				value - (string, array, or object) if an object or array the object will be JSON encoded; otherwise stored as provided.
		*/
		setJSONData: function(name, value){
			return this.setData(name, JSON.encode(value));
		},

		/*
			retrieves a property from HTML5 data property you specify
		
			arguments:
				name - (retrieve) the data name to store; will be automatically prefixed with 'data-'
				strict - (boolean) if true, will set the JSON.decode's secure flag to true; otherwise the value is still tested but allows single quoted attributes.
				defaultValue - (string, array, or object) the value to set if no value is found (see storeData above)
		*/
		getJSONData: function(name, strict, defaultValue){
			var value = this.get('data-' + name);
			if (value != undefined){
				if (value && JSON.isSecure(value)) {
					return JSON.decode(value, strict);
				} else {
					return value;
				}
			} else if (defaultValue != undefined){
				this.setJSONData(name, defaultValue);
				return defaultValue;
			}
		}

	});

})();

/*
---
name: BehaviorAPI
description: HTML getters for Behavior's API model.
requires: [Core/Class, /Element.Data]
provides: [BehaviorAPI]
...
*/


(function(){
	//see Docs/BehaviorAPI.md for documentation of public methods.

	var reggy = /[^a-z0-9\-]/gi;

	window.BehaviorAPI = new Class({
		element: null,
		prefix: '',
		defaults: {},

		initialize: function(element, prefix){
			this.element = element;
			this.prefix = prefix.toLowerCase().replace(reggy, '');
		},

		/******************
		 * PUBLIC METHODS
		 ******************/

		get: function(/* name[, name, name, etc] */){
			if (arguments.length > 1) return this._getObj(Array.from(arguments));
			return this._getValue(arguments[0]);
		},

		getAs: function(/*returnType, name, defaultValue OR {name: returnType, name: returnType, etc}*/){
			if (typeOf(arguments[0]) == 'object') return this._getValuesAs.apply(this, arguments);
			return this._getValueAs.apply(this, arguments);
		},

		require: function(/* name[, name, name, etc] */){
			for (var i = 0; i < arguments.length; i++){
				if (this._getValue(arguments[i]) == undefined) throw new Error('Could not retrieve ' + this.prefix + '-' + arguments[i] + ' option from element.');
			}
			return this;
		},

		requireAs: function(returnType, name /* OR {name: returnType, name: returnType, etc}*/){
			var val;
			if (typeOf(arguments[0]) == 'object'){
				for (var objName in arguments[0]){
					val = this._getValueAs(arguments[0][objName], objName);
					if (val === undefined || val === null) throw new Error("Could not retrieve " + this.prefix + '-' + objName + " option from element.");
				}
			} else {
				val = this._getValueAs(returnType, name);
				if (val === undefined || val === null) throw new Error("Could not retrieve " + this.prefix + '-' + name + " option from element.");
			}
			return this;
		},

		setDefault: function(name, value /* OR {name: value, name: value, etc }*/){
			if (typeOf(arguments[0]) == 'object'){
				for (var objName in arguments[0]){
					this.setDefault(objName, arguments[0][objName]);
				}
				return;
			}
			name = name.camelCase();
			this.defaults[name] = value;
			if (this._getValue(name) == null){
				var options = this._getOptions();
				options[name] = value;
			}
			return this;
		},

		refreshAPI: function(){
			delete this.options;
			this.setDefault(this.defaults);
			return;
		},

		/******************
		 * PRIVATE METHODS
		 ******************/

		//given an array of names, returns an object of key/value pairs for each name
		_getObj: function(names){
			var obj = {};
			names.each(function(name){
				var value = this._getValue(name);
				if (value !== undefined) obj[name] = value;
			}, this);
			return obj;
		},
		//gets the data-behaviorname-options object and parses it as JSON
		_getOptions: function(){
			if (!this.options){
				var options = this.element.getData(this.prefix + '-options', '{}');
				if (options && options[0] != '{') options = '{' + options + '}';
				var isSecure = JSON.isSecure(options);
				if (!isSecure) throw new Error('warning, options value for element is not parsable, check your JSON format for quotes, etc.');
				this.options = isSecure ? JSON.decode(options) : {};
				for (option in this.options) {
					this.options[option.camelCase()] = this.options[option];
				}
			}
			return this.options;
		},
		//given a name (string) returns the value for it
		_getValue: function(name){
			name = name.camelCase();
			var options = this._getOptions();
			if (!options.hasOwnProperty(name)){
				var inline = this.element.getData(this.prefix + '-' + name.hyphenate());
				if (inline) options[name] = inline;
			}
			return options[name];
		},
		//given a Type and a name (string) returns the value for it coerced to that type if possible
		//else returns the defaultValue or null
		_getValueAs: function(returnType, name, defaultValue){
			var value = this._getValue(name);
			if (value == null || value == undefined) return defaultValue;
			var coerced = this._coerceFromString(returnType, value);
			if (coerced == null) throw new Error("Could not retrieve value '" + name + "' as the specified type. Its value is: " + value);
			return coerced;
		},
		//given an object of name/Type pairs, returns those as an object of name/value (as specified Type) pairs
		_getValuesAs: function(obj){
			var returnObj = {};
			for (var name in obj){
				returnObj[name] = this._getValueAs(obj[name], name);
			}
			return returnObj;
		},
		//attempts to run a value through the JSON parser. If the result is not of that type returns null.
		_coerceFromString: function(toType, value){
			if (typeOf(value) == 'string' && toType != String){
				if (JSON.isSecure(value)) value = JSON.decode(value);
			}
			if (instanceOf(value, toType)) return value;
			return null;
		}
	});

})();

/*
---
name: Behavior
description: Auto-instantiates widgets/classes based on parsed, declarative HTML.
requires: [Core/Class.Extras, Core/Element.Event, Core/Selectors, More/Table, /Element.Data, /BehaviorAPI]
provides: [Behavior]
...
*/

(function(){

	var getLog = function(method){
		return function(){
			if (window.console && console[method]){
				if(console[method].apply) console[method].apply(console, arguments);
				else console[method](Array.from(arguments).join(' '));
			}
		};
	};

	var PassMethods = new Class({
		//pass a method pointer through to a filter
		//by default the methods for add/remove events are passed to the filter
		//pointed to this instance of behavior. you could use this to pass along
		//other methods to your filters. For example, a method to close a popup
		//for filters presented inside popups.
		passMethod: function(method, fn){
			if (this.API.prototype[method]) throw new Error('Cannot overwrite API method ' + method + ' as it already exists');
			this.API.implement(method, fn);
			return this;
		},

		passMethods: function(methods){
			for (method in methods) this.passMethod(method, methods[method]);
			return this;
		}

	});

	var spaceOrCommaRegex = /\s*,\s*|\s+/g;

	BehaviorAPI.implement({
		deprecate: function(deprecated, asJSON){
			var set,
			    values = {};
			Object.each(deprecated, function(prop, key){
				var value = this.element[ asJSON ? 'getJSONData' : 'getData'](prop);
				if (value !== undefined){
					set = true;
					values[key] = value;
				}
			}, this);
			this.setDefault(values);
			return this;
		}
	});

	this.Behavior = new Class({

		Implements: [Options, Events, PassMethods],

		options: {
			//by default, errors thrown by filters are caught; the onError event is fired.
			//set this to *true* to NOT catch these errors to allow them to be handled by the browser.
			// breakOnErrors: false,
			// container: document.body,

			//default error behavior when a filter cannot be applied
			onError: getLog('error'),
			onWarn: getLog('warn'),
			enableDeprecation: true,
			selector: '[data-behavior]'
		},

		initialize: function(options){
			this.setOptions(options);
			this.API = new Class({ Extends: BehaviorAPI });
			this.passMethods({
				addEvent: this.addEvent.bind(this),
				removeEvent: this.removeEvent.bind(this),
				addEvents: this.addEvents.bind(this),
				removeEvents: this.removeEvents.bind(this),
				fireEvent: this.fireEvent.bind(this),
				applyFilters: this.apply.bind(this),
				applyFilter: this.applyFilter.bind(this),
				getContentElement: this.getContentElement.bind(this),
				cleanup: this.cleanup.bind(this),
				getContainerSize: function(){
					return this.getContentElement().measure(function(){
						return this.getSize();
					});
				}.bind(this),
				error: function(){ this.fireEvent('error', arguments); }.bind(this),
				fail: function(){
					var msg = Array.join(arguments, ' ');
					throw new Error(msg);
				},
				warn: function(){
					this.fireEvent('warn', arguments);
				}.bind(this)
			});
		},

		getContentElement: function(){
			return this.options.container || document.body;
		},

		//Applies all the behavior filters for an element.
		//container - (element) an element to apply the filters registered with this Behavior instance to.
		//force - (boolean; optional) passed through to applyFilter (see it for docs)
		apply: function(container, force){
		  this._getElements(container).each(function(element){
				var plugins = [];
				element.getBehaviors().each(function(name){
					var filter = this.getFilter(name);
					if (!filter){
						this.fireEvent('error', ['There is no filter registered with this name: ', name, element]);
					} else {
						var config = filter.config;
						if (config.delay !== undefined){
							this.applyFilter.delay(filter.config.delay, this, [element, filter, force]);
						} else if(config.delayUntil){
							this._delayFilterUntil(element, filter, force);
						} else if(config.initializer){
							this._customInit(element, filter, force);
						} else {
							plugins.append(this.applyFilter(element, filter, force, true));
						}
					}
				}, this);
				plugins.each(function(plugin){ plugin(); });
			}, this);
			return this;
		},

		_getElements: function(container){
			if (typeOf(this.options.selector) == 'function') return this.options.selector(container);
			else return document.id(container).getElements(this.options.selector);
		},

		//delays a filter until the event specified in filter.config.delayUntil is fired on the element
		_delayFilterUntil: function(element, filter, force){
			var event = filter.config.delayUntil;
			var init = function(e){
				element.removeEvent(event, init);
				var setup = filter.setup;
				filter.setup = function(element, api, _pluginResult){
					api.event = e;
					setup.apply(filter, [element, api, _pluginResult]);
				};
				this.applyFilter(element, filter, force);
				filter.setup = setup;
			}.bind(this);
			element.addEvent(event, init);
		},

		//runs custom initiliazer defined in filter.config.initializer
		_customInit: function(element, filter, force){
			var api = new this.API(element, filter.name);
			api.runSetup = this.applyFilter.pass([element, filter, force], this);
			filter.config.initializer(element, api);
		},

		//Applies a specific behavior to a specific element.
		//element - the element to which to apply the behavior
		//filter - (object) a specific behavior filter, typically one registered with this instance or registered globally.
		//force - (boolean; optional) apply the behavior to each element it matches, even if it was previously applied. Defaults to *false*.
		//_returnPlugins - (boolean; optional; internal) if true, plugins are not rendered but instead returned as an array of functions
		//_pluginTargetResult - (obj; optional internal) if this filter is a plugin for another, this is whatever that target filter returned
		//                      (an instance of a class for example)
		applyFilter: function(element, filter, force, _returnPlugins, _pluginTargetResult){
			var pluginsToReturn = [];
			if (this.options.breakOnErrors){
				pluginsToReturn = this._applyFilter.apply(this, arguments);
			} else {
				try {
					pluginsToReturn = this._applyFilter.apply(this, arguments);
				} catch (e){
					this.fireEvent('error', ['Could not apply the behavior ' + filter.name, e]);
				}
			}
			return _returnPlugins ? pluginsToReturn : this;
		},

		//see argument list above for applyFilter
		_applyFilter: function(element, filter, force, _returnPlugins, _pluginTargetResult){
			var pluginsToReturn = [];
			element = document.id(element);
			//get the filters already applied to this element
			var applied = getApplied(element);
			//if this filter is not yet applied to the element, or we are forcing the filter
			if (!applied[filter.name] || force){
				//if it was previously applied, garbage collect it
				if (applied[filter.name]) applied[filter.name].cleanup(element);
				var api = new this.API(element, filter.name);

				//deprecated
				api.markForCleanup = filter.markForCleanup.bind(filter);
				api.onCleanup = function(fn){
					filter.markForCleanup(element, fn);
				};

				if (filter.config.deprecated && this.options.enableDeprecation) api.deprecate(filter.config.deprecated);
				if (filter.config.deprecateAsJSON && this.options.enableDeprecation) api.deprecate(filter.config.deprecatedAsJSON, true);

				//deal with requirements and defaults
				if (filter.config.requireAs){
					api.requireAs(filter.config.requireAs);
				} else if (filter.config.require){
					api.require.apply(api, Array.from(filter.config.require));
				}

				if (filter.config.defaults) api.setDefault(filter.config.defaults);

				//apply the filter
				var result = filter.setup(element, api, _pluginTargetResult);
				if (filter.config.returns && !instanceOf(result, filter.config.returns)){
					throw new Error("Filter " + filter.name + " did not return a valid instance.");
				}
				element.store('Behavior Filter result:' + filter.name, result);
				//and mark it as having been previously applied
				applied[filter.name] = filter;
				//apply all the plugins for this filter
				var plugins = this.getPlugins(filter.name);
				if (plugins){
					for (var name in plugins){
						if (_returnPlugins){
							pluginsToReturn.push(this.applyFilter.pass([element, plugins[name], force, null, result], this));
						} else {
							this.applyFilter(element, plugins[name], force, null, result);
						}
					}
				}
			}
			return pluginsToReturn;
		},

		//given a name, returns a registered behavior
		getFilter: function(name){
			return this._registered[name] || Behavior.getFilter(name);
		},

		getPlugins: function(name){
			return this._plugins[name] || Behavior._plugins[name];
		},

		//Garbage collects all applied filters for an element and its children.
		//element - (*element*) container to cleanup
		//ignoreChildren - (*boolean*; optional) if *true* only the element will be cleaned, otherwise the element and all the
		//	  children with filters applied will be cleaned. Defaults to *false*.
		cleanup: function(element, ignoreChildren){
			element = document.id(element);
			var applied = getApplied(element);
			for (var filter in applied){
				applied[filter].cleanup(element);
				element.eliminate('Behavior Filter result:' + filter);
				delete applied[filter];
			}
			if (!ignoreChildren) this._getElements(element).each(this.cleanup, this);
			return this;
		}

	});

	//Export these for use elsewhere (notabily: Delegator).
	Behavior.getLog = getLog;
	Behavior.PassMethods = PassMethods;


	//Returns the applied behaviors for an element.
	var getApplied = function(el){
		return el.retrieve('_appliedBehaviors', {});
	};

	//Registers a behavior filter.
	//name - the name of the filter
	//fn - a function that applies the filter to the given element
	//overwrite - (boolean) if true, will overwrite existing filter if one exists; defaults to false.
	var addFilter = function(name, fn, overwrite){
		if (!this._registered[name] || overwrite) this._registered[name] = new Behavior.Filter(name, fn);
		else throw new Error('Could not add the Behavior filter "' + name  +'" as a previous trigger by that same name exists.');
	};

	var addFilters = function(obj, overwrite){
		for (var name in obj){
			addFilter.apply(this, [name, obj[name], overwrite]);
		}
	};

	//Registers a behavior plugin
	//filterName - (*string*) the filter (or plugin) this is a plugin for
	//name - (*string*) the name of this plugin
	//setup - a function that applies the filter to the given element
	var addPlugin = function(filterName, name, setup, overwrite){
		if (!this._plugins[filterName]) this._plugins[filterName] = {};
		if (!this._plugins[filterName][name] || overwrite) this._plugins[filterName][name] = new Behavior.Filter(name, setup);
		else throw new Error('Could not add the Behavior filter plugin "' + name  +'" as a previous trigger by that same name exists.');
	};

	var addPlugins = function(obj, overwrite){
		for (var name in obj){
			addPlugin.apply(this, [obj[name].fitlerName, obj[name].name, obj[name].setup], overwrite);
		}
	};

	var setFilterDefaults = function(name, defaults){
		var filter = this.getFilter(name);
		Object.append(filter.config.defaults, defaults);
	};

	//Add methods to the Behavior namespace for global registration.
	Object.append(Behavior, {
		_registered: {},
		_plugins: {},
		addGlobalFilter: addFilter,
		addGlobalFilters: addFilters,
		addGlobalPlugin: addPlugin,
		addGlobalPlugins: addPlugins,
		setFilterDefaults: setFilterDefaults,
		getFilter: function(name){
			return this._registered[name];
		}
	});
	//Add methods to the Behavior class for instance registration.
	Behavior.implement({
		_registered: {},
		_plugins: {},
		addFilter: addFilter,
		addFilters: addFilters,
		addPlugin: addPlugin,
		addPlugins: addPlugins,
		setFilterDefaults: setFilterDefaults
	});

	//This class is an actual filter that, given an element, alters it with specific behaviors.
	Behavior.Filter = new Class({

		config: {
			/**
				returns: Foo,
				require: ['req1', 'req2'],
				//or
				requireAs: {
					req1: Boolean,
					req2: Number,
					req3: String
				},
				defaults: {
					opt1: false,
					opt2: 2
				},
				//simple example:
				setup: function(element, API){
					var kids = element.getElements(API.get('selector'));
					//some validation still has to occur here
					if (!kids.length) API.fail('there were no child elements found that match ', API.get('selector'));
					if (kids.length < 2) API.warn("there weren't more than 2 kids that match", API.get('selector'));
					var fooInstance = new Foo(kids, API.get('opt1', 'opt2'));
					API.onCleanup(function(){
						fooInstance.destroy();
					});
					return fooInstance;
				},
				delayUntil: 'mouseover',
				//OR
				delay: 100,
				//OR
				initializer: function(element, API){
					element.addEvent('mouseover', API.runSetup); //same as specifying event
					//or
					API.runSetup.delay(100); //same as specifying delay
					//or something completely esoteric
					var timer = (function(){
						if (element.hasClass('foo')){
							clearInterval(timer);
							API.runSetup();
						}
					}).periodical(100);
					//or
					API.addEvent('someBehaviorEvent', API.runSetup);
				});
				*/
		},

		//Pass in an object with the following properties:
		//name - the name of this filter
		//setup - a function that applies the filter to the given element
		initialize: function(name, setup){
			this.name = name;
			if (typeOf(setup) == "function"){
				this.setup = setup;
			} else {
				Object.append(this.config, setup);
				this.setup = this.config.setup;
			}
			this._cleanupFunctions = new Table();
		},

		//Stores a garbage collection pointer for a specific element.
		//Example: if your filter enhances all the inputs in the container
		//you might have a function that removes that enhancement for garbage collection.
		//You would mark each input matched with its own cleanup function.
		//NOTE: this MUST be the element passed to the filter - the element with this filters
		//      name in its data-behavior property. I.E.:
		//<form data-behavior="FormValidator">
		//  <input type="text" name="email"/>
		//</form>
		//If this filter is FormValidator, you can mark the form for cleanup, but not, for example
		//the input. Only elements that match this filter can be marked.
		markForCleanup: function(element, fn){
			var functions = this._cleanupFunctions.get(element);
			if (!functions) functions = [];
			functions.include(fn);
			this._cleanupFunctions.set(element, functions);
			return this;
		},

		//Garbage collect a specific element.
		//NOTE: this should be an element that has a data-behavior property that matches this filter.
		cleanup: function(element){
			var marks = this._cleanupFunctions.get(element);
			if (marks){
				marks.each(function(fn){ fn(); });
				this._cleanupFunctions.erase(element);
			}
			return this;
		}

	});

	Behavior.elementDataProperty = 'behavior';

	Element.implement({

		addBehavior: function(name){
			return this.setData(Behavior.elementDataProperty, this.getBehaviors().include(name).join(' '));
		},

		removeBehavior: function(name){
			return this.setData(Behavior.elementDataProperty, this.getBehaviors().erase(name).join(' '));
		},

		getBehaviors: function(){
			var filters = this.getData(Behavior.elementDataProperty);
			if (!filters) return [];
			return filters.trim().split(spaceOrCommaRegex);
		},

		hasBehavior: function(name){
			return this.getBehaviors().contains(name);
		},

		getBehaviorResult: function(name){
			return this.retrieve('Behavior Filter result:' + name);
		}

	});


})();


/*
---

name: Element.Delegation

description: Extends the Element native object to include the delegate method for more efficient event management.

license: MIT-style license.

requires: [Element.Event]

provides: [Element.Delegation]

...
*/

(function(){

var eventListenerSupport = !!window.addEventListener;

Element.NativeEvents.focusin = Element.NativeEvents.focusout = 2;

var bubbleUp = function(self, match, fn, event, target){
	while (target && target != self){
		if (match(target, event)) return fn.call(target, event, target);
		target = document.id(target.parentNode);
	}
};

var map = {
	mouseenter: {
		base: 'mouseover'
	},
	mouseleave: {
		base: 'mouseout'
	},
	focus: {
		base: 'focus' + (eventListenerSupport ? '' : 'in'),
		capture: true
	},
	blur: {
		base: eventListenerSupport ? 'blur' : 'focusout',
		capture: true
	}
};

/*<ltIE9>*/
var _key = '$delegation:';
var formObserver = function(type){

	return {

		base: 'focusin',

		remove: function(self, uid){
			var list = self.retrieve(_key + type + 'listeners', {})[uid];
			if (list && list.forms) for (var i = list.forms.length; i--;){
				list.forms[i].removeEvent(type, list.fns[i]);
			}
		},

		listen: function(self, match, fn, event, target, uid){
			var form = (target.get('tag') == 'form') ? target : event.target.getParent('form');
			if (!form) return;

			var listeners = self.retrieve(_key + type + 'listeners', {}),
				listener = listeners[uid] || {forms: [], fns: []},
				forms = listener.forms, fns = listener.fns;

			if (forms.indexOf(form) != -1) return;
			forms.push(form);

			var _fn = function(event){
				bubbleUp(self, match, fn, event, target);
			};
			form.addEvent(type, _fn);
			fns.push(_fn);

			listeners[uid] = listener;
			self.store(_key + type + 'listeners', listeners);
		}
	};
};

var inputObserver = function(type){
	return {
		base: 'focusin',
		listen: function(self, match, fn, event, target){
			var events = {blur: function(){
				this.removeEvents(events);
			}};
			events[type] = function(event){
				bubbleUp(self, match, fn, event, target);
			};
			event.target.addEvents(events);
		}
	};
};

if (!eventListenerSupport) Object.append(map, {
	submit: formObserver('submit'),
	reset: formObserver('reset'),
	change: inputObserver('change'),
	select: inputObserver('select')
});
/*</ltIE9>*/

var proto = Element.prototype,
	addEvent = proto.addEvent,
	removeEvent = proto.removeEvent;

var relay = function(old, method){
	return function(type, fn, useCapture){
		if (type.indexOf(':relay') == -1) return old.call(this, type, fn, useCapture);
		var parsed = Slick.parse(type).expressions[0][0];
		if (parsed.pseudos[0].key != 'relay') return old.call(this, type, fn, useCapture);
		var newType = parsed.tag;
		parsed.pseudos.slice(1).each(function(pseudo){
			newType += ':' + pseudo.key + (pseudo.value ? '(' + pseudo.value + ')' : '');
		});
		old.call(this, type, fn);
		return method.call(this, newType, parsed.pseudos[0].value, fn);
	};
};

var delegation = {

	addEvent: function(type, match, fn){
		var storage = this.retrieve('$delegates', {}), stored = storage[type];
		if (stored) for (var _uid in stored){
			if (stored[_uid].fn == fn && stored[_uid].match == match) return this;
		}

		var _type = type, _match = match, _fn = fn, _map = map[type] || {};
		type = _map.base || _type;

		match = function(target){
			return Slick.match(target, _match);
		};

		var elementEvent = Element.Events[_type];
		if (elementEvent && elementEvent.condition){
			var __match = match, condition = elementEvent.condition;
			match = function(target, event){
				return __match(target, event) && condition.call(target, event, type);
			};
		}

		var self = this, uid = String.uniqueID();
		var delegator = _map.listen ? function(event, target){
			if (!target && event && event.target) target = event.target;
			if (target) _map.listen(self, match, fn, event, target, uid);
		} : function(event, target){
			if (!target && event && event.target) target = event.target;
			if (target) bubbleUp(self, match, fn, event, target);
		};

		if (!stored) stored = {};
		stored[uid] = {
			match: _match,
			fn: _fn,
			delegator: delegator
		};
		storage[_type] = stored;
		return addEvent.call(this, type, delegator, _map.capture);
	},

	removeEvent: function(type, match, fn, _uid){
		var storage = this.retrieve('$delegates', {}), stored = storage[type];
		if (!stored) return this;

		if (_uid){
			var _type = type, delegator = stored[_uid].delegator, _map = map[type] || {};
			type = _map.base || _type;
			if (_map.remove) _map.remove(this, _uid);
			delete stored[_uid];
			storage[_type] = stored;
			return removeEvent.call(this, type, delegator);
		}

		var __uid, s;
		if (fn) for (__uid in stored){
			s = stored[__uid];
			if (s.match == match && s.fn == fn) return delegation.removeEvent.call(this, type, match, fn, __uid);
		} else for (__uid in stored){
			s = stored[__uid];
			if (s.match == match) delegation.removeEvent.call(this, type, match, s.fn, __uid);
		}
		return this;
	}

};

[Element, Window, Document].invoke('implement', {
	addEvent: relay(addEvent, delegation.addEvent),
	removeEvent: relay(removeEvent, delegation.removeEvent)
});

})();


/*
---

name: Events.Pseudos

description: Adds the functionality to add pseudo events

license: MIT-style license

authors:
  - Arian Stolwijk

requires: [Core/Class.Extras, Core/Slick.Parser, More/MooTools.More]

provides: [Events.Pseudos]

...
*/

(function(){

Events.Pseudos = function(pseudos, addEvent, removeEvent){

	var storeKey = '_monitorEvents:';

	var storageOf = function(object){
		return {
			store: object.store ? function(key, value){
				object.store(storeKey + key, value);
			} : function(key, value){
				(object._monitorEvents || (object._monitorEvents = {}))[key] = value;
			},
			retrieve: object.retrieve ? function(key, dflt){
				return object.retrieve(storeKey + key, dflt);
			} : function(key, dflt){
				if (!object._monitorEvents) return dflt;
				return object._monitorEvents[key] || dflt;
			}
		};
	};

	var splitType = function(type){
		if (type.indexOf(':') == -1 || !pseudos) return null;

		var parsed = Slick.parse(type).expressions[0][0],
			parsedPseudos = parsed.pseudos,
			l = parsedPseudos.length,
			splits = [];

		while (l--){
			var pseudo = parsedPseudos[l].key,
				listener = pseudos[pseudo];
			if (listener != null) splits.push({
				event: parsed.tag,
				value: parsedPseudos[l].value,
				pseudo: pseudo,
				original: type,
				listener: listener
			});
		}
		return splits.length ? splits : null;
	};

	return {

		addEvent: function(type, fn, internal){
			var split = splitType(type);
			if (!split) return addEvent.call(this, type, fn, internal);

			var storage = storageOf(this),
				events = storage.retrieve(type, []),
				eventType = split[0].event,
				args = Array.slice(arguments, 2),
				stack = fn,
				self = this;

			split.each(function(item){
				var listener = item.listener,
					stackFn = stack;
				if (listener == false) eventType += ':' + item.pseudo + '(' + item.value + ')';
				else stack = function(){
					listener.call(self, item, stackFn, arguments, stack);
				};
			});

			events.include({type: eventType, event: fn, monitor: stack});
			storage.store(type, events);

			if (type != eventType) addEvent.apply(this, [type, fn].concat(args));
			return addEvent.apply(this, [eventType, stack].concat(args));
		},

		removeEvent: function(type, fn){
			var split = splitType(type);
			if (!split) return removeEvent.call(this, type, fn);

			var storage = storageOf(this),
				events = storage.retrieve(type);
			if (!events) return this;

			var args = Array.slice(arguments, 2);

			removeEvent.apply(this, [type, fn].concat(args));
			events.each(function(monitor, i){
				if (!fn || monitor.event == fn) removeEvent.apply(this, [monitor.type, monitor.monitor].concat(args));
				delete events[i];
			}, this);

			storage.store(type, events);
			return this;
		}

	};

};

var pseudos = {

	once: function(split, fn, args, monitor){
		fn.apply(this, args);
		this.removeEvent(split.event, monitor)
			.removeEvent(split.original, fn);
	},

	throttle: function(split, fn, args){
		if (!fn._throttled){
			fn.apply(this, args);
			fn._throttled = setTimeout(function(){
				fn._throttled = false;
			}, split.value || 250);
		}
	},

	pause: function(split, fn, args){
		clearTimeout(fn._pause);
		fn._pause = fn.delay(split.value || 250, this, args);
	}

};

Events.definePseudo = function(key, listener){
	pseudos[key] = listener;
	return this;
};

Events.lookupPseudo = function(key){
	return pseudos[key];
};

var proto = Events.prototype;
Events.implement(Events.Pseudos(pseudos, proto.addEvent, proto.removeEvent));

['Request', 'Fx'].each(function(klass){
	if (this[klass]) this[klass].implement(Events.prototype);
});

})();


/*
---

name: Element.Event.Pseudos

description: Adds the functionality to add pseudo events for Elements

license: MIT-style license

authors:
  - Arian Stolwijk

requires: [Core/Element.Event, Core/Element.Delegation, Events.Pseudos]

provides: [Element.Event.Pseudos, Element.Delegation]

...
*/

(function(){

var pseudos = {relay: false},
	copyFromEvents = ['once', 'throttle', 'pause'],
	count = copyFromEvents.length;

while (count--) pseudos[copyFromEvents[count]] = Events.lookupPseudo(copyFromEvents[count]);

DOMEvent.definePseudo = function(key, listener){
	pseudos[key] = listener;
	return this;
};

var proto = Element.prototype;
[Element, Window, Document].invoke('implement', Events.Pseudos(pseudos, proto.addEvent, proto.removeEvent));

})();


/*
---
name: Event.Mock

description: Supplies a Mock Event object for use on fireEvent

license: MIT-style

authors:
- Arieh Glazer

requires: Core/Event

provides: [Event.Mock]

...
*/

(function($,window,undef){

/**
 * creates a Mock event to be used with fire event
 * @param Element target an element to set as the target of the event - not required
 *  @param string type the type of the event to be fired. Will not be used by IE - not required.
 *
 */
Event.Mock = function(target,type){
	var e = window.event;

	type = type || 'click';

	if (document.createEvent){
		e = document.createEvent('HTMLEvents');
		e.initEvent(
			type //event type
			, false //bubbles - set to false because the event should like normal fireEvent
			, true //cancelable
		);
	}

	e = new Event(e);

	e.target = target;

	return e;
};

})(document.id,window);

/*
---
name: Delegator
description: Allows for the registration of delegated events on a container.
requires: [More/Element.Delegation, Core/Options, Core/Events, /Event.Mock, /Behavior]
provides: [Delegator]
...
*/
(function(){

	var spaceOrCommaRegex = /\s*,\s*|\s+/g;

	window.Delegator = new Class({

		Implements: [Options, Events, Behavior.PassMethods],

		options: {
			// breakOnErrors: false,
			getBehavior: function(){},
			onError: Behavior.getLog('error'),
			onWarn: Behavior.getLog('warn')
		},

		initialize: function(options){
			this.setOptions(options);
			this._bound = {
				eventHandler: this._eventHandler.bind(this)
			};
			Delegator._instances.push(this);
			Object.each(Delegator._triggers, function(trigger){
				this._eventTypes.combine(trigger.types);
			}, this);
			this.API = new Class({ Extends: BehaviorAPI });
			this.passMethods({
				addEvent: this.addEvent.bind(this), 
				removeEvent: this.removeEvent.bind(this),
				addEvents: this.addEvents.bind(this), 
				removeEvents: this.removeEvents.bind(this),
				fireEvent: this.fireEvent.bind(this),
				attach: this.attach.bind(this),
				trigger: this.trigger.bind(this),
				error: function(){ this.fireEvent('error', arguments); }.bind(this),
				fail: function(){
					var msg = Array.join(arguments, ' ');
					throw new Error(msg);
				},
				warn: function(){
					this.fireEvent('warn', arguments);
				}.bind(this),
				getBehavior: function(){
					return this.options.getBehavior();
				}.bind(this)
			});

			this.bindToBehavior(this.options.getBehavior());
		},

		bindToBehavior: function(behavior){
			if (!behavior) return;
			this.unbindFromBehavior();
			this._behavior = behavior;
			if (!this._behaviorEvents){
				var self = this;
				this._behaviorEvents = {
					destroyDom: function(elements){
						Array.from(elements).each(function(element){
							self._behavior.cleanup(element);
						});
					},
					ammendDom: function(container){
						self._behavior.apply(container);
					}
				};
			}
			this.addEvents(this._behaviorEvents);
		},

		getBehavior: function(){
			return this._behavior;
		},

		unbindFromBehavior: function(){
			if (this._behaviorEvents && this._behavior){
				this._behavior.removeEvents(this._behaviorEvents);
				delete this._behavior;
			}
		},

		attach: function(target, _method){
			_method = _method || 'addEvent';
			target = document.id(target);
			if ((_method == 'addEvent' && this._attachedTo.contains(target)) ||
			    (_method == 'removeEvent') && !this._attachedTo.contains(target)) return this;
			this._eventTypes.each(function(event){
				target[_method](event + ':relay([data-trigger])', this._bound.eventHandler);
			}, this);
			this._attachedTo.push(target);
			return this;
		},

		detach: function(target){
			if (target){
				this.attach(target, 'removeEvent');
				return this;
			} else {
				this._attachedTo.each(this.detach, this);
			}
		},

		trigger: function(name, element, event){
			if (!event || typeOf(event) == "string") event = new Event.Mock(element, event);
			var trigger = this._getTrigger(name);
			if (trigger && trigger.types.contains(event.type)) {
				if (this.options.breakOnErrors){
					this._trigger(trigger, element, event);
				} else {
					try {
						this._trigger(trigger, element, event);
					} catch(e) {
						this.fireEvent('error', ['Could not apply the trigger', name, e]);
					}
				}
			} else {
				this.fireEvent('error', 'Could not find a trigger with the name ' + name + ' for event: ' + event.type);
			}
			return this;
		},

		/******************
		 * PRIVATE METHODS
		 ******************/

		_getTrigger: function(name){
			return this._triggers[name] || Delegator._triggers[name];
		},

		_trigger: function(trigger, element, event){
			var api = new this.API(element, trigger.name);
			if (trigger.requireAs){
				api.requireAs(trigger.requireAs);
			} else if (trigger.require){
				api.require.apply(api, Array.from(trigger.require));
			} if (trigger.defaults){
				api.setDefault(trigger.defaults);
			}
			trigger.handler.apply(this, [event, element, api]);
			this.fireEvent('trigger', [trigger, element, event]);
		},

		_eventHandler: function(event, target){
			var triggers = target.getTriggers();
			if (triggers.contains('Stop')) event.stop();
			if (triggers.contains('PreventDefault')) event.preventDefault();
			triggers.each(function(trigger){
				if (trigger != "Stop" && trigger != "PreventDefault") this.trigger(trigger, target, event);
			}, this);
		},

		_onRegister: function(eventTypes){
			eventTypes.each(function(eventType){
				if (!this._eventTypes.contains(eventType)){
					this._attachedTo.each(function(element){
						element.addEvent(eventType + ':relay([data-trigger])', this._bound.eventHandler);
					}, this);
				}
				this._eventTypes.include(eventType);
			}, this);
		},

		_attachedTo: [],
		_eventTypes: [],
		_triggers: {}

	});

	Delegator._triggers = {};
	Delegator._instances = [];
	Delegator._onRegister = function(eventType){
		this._instances.each(function(instance){
			instance._onRegister(eventType);
		});
	};

	Delegator.register = function(eventTypes, name, handler, overwrite /** or eventType, obj, overwrite */){
		eventTypes = Array.from(eventTypes);
		if (typeOf(name) == "object"){
			var obj = name;
			for (name in obj){
				this.register.apply(this, [eventTypes, name, obj[name], handler]);
			}
			return this;
		}
		if (!this._triggers[name] || overwrite){
			if (typeOf(handler) == "function"){
				handler = {
					handler: handler
				};
			}
			handler.types = eventTypes;
			handler.name = name;
			this._triggers[name] = handler;
			this._onRegister(eventTypes);
		} else {
			throw new Error('Could add the trigger "' + name  +'" as a previous trigger by that same name exists.');
		}
		return this;
	};

	Delegator.implement('register', Delegator.register);

	Element.implement({

		addTrigger: function(name){
			return this.setData('trigger', this.getTriggers().include(name).join(' '));
		},

		removeTrigger: function(name){
			return this.setData('trigger', this.getTriggers().erase(name).join(' '));
		},

		getTriggers: function(){
			var triggers = this.getData('trigger');
			if (!triggers) return [];
			return triggers.trim().split(spaceOrCommaRegex);
		},

		hasTrigger: function(name){
			return this.getTriggers().contains(name);
		}

	});

})();

/*
---

script: Class.Binds.js

name: Class.Binds

description: Automagically binds specified methods in a class to the instance of the class.

license: MIT-style license

authors:
  - Aaron Newton

requires:
  - Core/Class
  - /MooTools.More

provides: [Class.Binds]

...
*/

Class.Mutators.Binds = function(binds){
	if (!this.prototype.initialize) this.implement('initialize', function(){});
	return Array.from(binds).concat(this.prototype.Binds || []);
};

Class.Mutators.initialize = function(initialize){
	return function(){
		Array.from(this.Binds).each(function(name){
			var original = this[name];
			if (original) this[name] = original.bind(this);
		}, this);
		return initialize.apply(this, arguments);
	};
};


/*
---

name: Element.Style

description: Contains methods for interacting with the styles of Elements in a fashionable way.

license: MIT-style license.

requires: Element

provides: Element.Style

...
*/

(function(){

var html = document.html;

Element.Properties.styles = {set: function(styles){
	this.setStyles(styles);
}};

var hasOpacity = (html.style.opacity != null),
	hasFilter = (html.style.filter != null),
	reAlpha = /alpha\(opacity=([\d.]+)\)/i;

var setVisibility = function(element, opacity){
	element.store('$opacity', opacity);
	element.style.visibility = opacity > 0 ? 'visible' : 'hidden';
};

var setOpacity = (hasOpacity ? function(element, opacity){
	element.style.opacity = opacity;
} : (hasFilter ? function(element, opacity){
	if (!element.currentStyle || !element.currentStyle.hasLayout) element.style.zoom = 1;
	opacity = (opacity * 100).limit(0, 100).round();
	opacity = (opacity == 100) ? '' : 'alpha(opacity=' + opacity + ')';
	var filter = element.style.filter || element.getComputedStyle('filter') || '';
	element.style.filter = reAlpha.test(filter) ? filter.replace(reAlpha, opacity) : filter + opacity;
} : setVisibility));

var getOpacity = (hasOpacity ? function(element){
	var opacity = element.style.opacity || element.getComputedStyle('opacity');
	return (opacity == '') ? 1 : opacity.toFloat();
} : (hasFilter ? function(element){
	var filter = (element.style.filter || element.getComputedStyle('filter')),
		opacity;
	if (filter) opacity = filter.match(reAlpha);
	return (opacity == null || filter == null) ? 1 : (opacity[1] / 100);
} : function(element){
	var opacity = element.retrieve('$opacity');
	if (opacity == null) opacity = (element.style.visibility == 'hidden' ? 0 : 1);
	return opacity;
}));

var floatName = (html.style.cssFloat == null) ? 'styleFloat' : 'cssFloat';

Element.implement({

	getComputedStyle: function(property){
		if (this.currentStyle) return this.currentStyle[property.camelCase()];
		var defaultView = Element.getDocument(this).defaultView,
			computed = defaultView ? defaultView.getComputedStyle(this, null) : null;
		return (computed) ? computed.getPropertyValue((property == floatName) ? 'float' : property.hyphenate()) : null;
	},

	setStyle: function(property, value){
		if (property == 'opacity'){
			setOpacity(this, parseFloat(value));
			return this;
		}
		property = (property == 'float' ? floatName : property).camelCase();
		if (typeOf(value) != 'string'){
			var map = (Element.Styles[property] || '@').split(' ');
			value = Array.from(value).map(function(val, i){
				if (!map[i]) return '';
				return (typeOf(val) == 'number') ? map[i].replace('@', Math.round(val)) : val;
			}).join(' ');
		} else if (value == String(Number(value))){
			value = Math.round(value);
		}
		this.style[property] = value;
		return this;
	},

	getStyle: function(property){
		if (property == 'opacity') return getOpacity(this);
		property = (property == 'float' ? floatName : property).camelCase();
		var result = this.style[property];
		if (!result || property == 'zIndex'){
			result = [];
			for (var style in Element.ShortStyles){
				if (property != style) continue;
				for (var s in Element.ShortStyles[style]) result.push(this.getStyle(s));
				return result.join(' ');
			}
			result = this.getComputedStyle(property);
		}
		if (result){
			result = String(result);
			var color = result.match(/rgba?\([\d\s,]+\)/);
			if (color) result = result.replace(color[0], color[0].rgbToHex());
		}
		if (Browser.opera || (Browser.ie && isNaN(parseFloat(result)))){
			if ((/^(height|width)$/).test(property)){
				var values = (property == 'width') ? ['left', 'right'] : ['top', 'bottom'], size = 0;
				values.each(function(value){
					size += this.getStyle('border-' + value + '-width').toInt() + this.getStyle('padding-' + value).toInt();
				}, this);
				return this['offset' + property.capitalize()] - size + 'px';
			}
			if (Browser.opera && String(result).indexOf('px') != -1) return result;
			if ((/^border(.+)Width|margin|padding/).test(property)) return '0px';
		}
		return result;
	},

	setStyles: function(styles){
		for (var style in styles) this.setStyle(style, styles[style]);
		return this;
	},

	getStyles: function(){
		var result = {};
		Array.flatten(arguments).each(function(key){
			result[key] = this.getStyle(key);
		}, this);
		return result;
	}

});

Element.Styles = {
	left: '@px', top: '@px', bottom: '@px', right: '@px',
	width: '@px', height: '@px', maxWidth: '@px', maxHeight: '@px', minWidth: '@px', minHeight: '@px',
	backgroundColor: 'rgb(@, @, @)', backgroundPosition: '@px @px', color: 'rgb(@, @, @)',
	fontSize: '@px', letterSpacing: '@px', lineHeight: '@px', clip: 'rect(@px @px @px @px)',
	margin: '@px @px @px @px', padding: '@px @px @px @px', border: '@px @ rgb(@, @, @) @px @ rgb(@, @, @) @px @ rgb(@, @, @)',
	borderWidth: '@px @px @px @px', borderStyle: '@ @ @ @', borderColor: 'rgb(@, @, @) rgb(@, @, @) rgb(@, @, @) rgb(@, @, @)',
	zIndex: '@', 'zoom': '@', fontWeight: '@', textIndent: '@px', opacity: '@'
};

//<1.3compat>

Element.implement({

	setOpacity: function(value){
		setOpacity(this, value);
		return this;
	},

	getOpacity: function(){
		return getOpacity(this);
	}

});

Element.Properties.opacity = {

	set: function(opacity){
		setOpacity(this, opacity);
		setVisibility(this, opacity);
	},

	get: function(){
		return getOpacity(this);
	}

};

//</1.3compat>

//<1.2compat>

Element.Styles = new Hash(Element.Styles);

//</1.2compat>

Element.ShortStyles = {margin: {}, padding: {}, border: {}, borderWidth: {}, borderStyle: {}, borderColor: {}};

['Top', 'Right', 'Bottom', 'Left'].each(function(direction){
	var Short = Element.ShortStyles;
	var All = Element.Styles;
	['margin', 'padding'].each(function(style){
		var sd = style + direction;
		Short[style][sd] = All[sd] = '@px';
	});
	var bd = 'border' + direction;
	Short.border[bd] = All[bd] = '@px @ rgb(@, @, @)';
	var bdw = bd + 'Width', bds = bd + 'Style', bdc = bd + 'Color';
	Short[bd] = {};
	Short.borderWidth[bdw] = Short[bd][bdw] = All[bdw] = '@px';
	Short.borderStyle[bds] = Short[bd][bds] = All[bds] = '@';
	Short.borderColor[bdc] = Short[bd][bdc] = All[bdc] = 'rgb(@, @, @)';
});

})();


/*
---

name: Element.Dimensions

description: Contains methods to work with size, scroll, or positioning of Elements and the window object.

license: MIT-style license.

credits:
  - Element positioning based on the [qooxdoo](http://qooxdoo.org/) code and smart browser fixes, [LGPL License](http://www.gnu.org/licenses/lgpl.html).
  - Viewport dimensions based on [YUI](http://developer.yahoo.com/yui/) code, [BSD License](http://developer.yahoo.com/yui/license.html).

requires: [Element, Element.Style]

provides: [Element.Dimensions]

...
*/

(function(){

var element = document.createElement('div'),
	child = document.createElement('div');
element.style.height = '0';
element.appendChild(child);
var brokenOffsetParent = (child.offsetParent === element);
element = child = null;

var isOffset = function(el){
	return styleString(el, 'position') != 'static' || isBody(el);
};

var isOffsetStatic = function(el){
	return isOffset(el) || (/^(?:table|td|th)$/i).test(el.tagName);
};

Element.implement({

	scrollTo: function(x, y){
		if (isBody(this)){
			this.getWindow().scrollTo(x, y);
		} else {
			this.scrollLeft = x;
			this.scrollTop = y;
		}
		return this;
	},

	getSize: function(){
		if (isBody(this)) return this.getWindow().getSize();
		return {x: this.offsetWidth, y: this.offsetHeight};
	},

	getScrollSize: function(){
		if (isBody(this)) return this.getWindow().getScrollSize();
		return {x: this.scrollWidth, y: this.scrollHeight};
	},

	getScroll: function(){
		if (isBody(this)) return this.getWindow().getScroll();
		return {x: this.scrollLeft, y: this.scrollTop};
	},

	getScrolls: function(){
		var element = this.parentNode, position = {x: 0, y: 0};
		while (element && !isBody(element)){
			position.x += element.scrollLeft;
			position.y += element.scrollTop;
			element = element.parentNode;
		}
		return position;
	},

	getOffsetParent: brokenOffsetParent ? function(){
		var element = this;
		if (isBody(element) || styleString(element, 'position') == 'fixed') return null;

		var isOffsetCheck = (styleString(element, 'position') == 'static') ? isOffsetStatic : isOffset;
		while ((element = element.parentNode)){
			if (isOffsetCheck(element)) return element;
		}
		return null;
	} : function(){
		var element = this;
		if (isBody(element) || styleString(element, 'position') == 'fixed') return null;

		try {
			return element.offsetParent;
		} catch(e) {}
		return null;
	},

	getOffsets: function(){
		if (this.getBoundingClientRect && !Browser.Platform.ios){
			var bound = this.getBoundingClientRect(),
				html = document.id(this.getDocument().documentElement),
				htmlScroll = html.getScroll(),
				elemScrolls = this.getScrolls(),
				isFixed = (styleString(this, 'position') == 'fixed');

			return {
				x: bound.left.toInt() + elemScrolls.x + ((isFixed) ? 0 : htmlScroll.x) - html.clientLeft,
				y: bound.top.toInt()  + elemScrolls.y + ((isFixed) ? 0 : htmlScroll.y) - html.clientTop
			};
		}

		var element = this, position = {x: 0, y: 0};
		if (isBody(this)) return position;

		while (element && !isBody(element)){
			position.x += element.offsetLeft;
			position.y += element.offsetTop;

			if (Browser.firefox){
				if (!borderBox(element)){
					position.x += leftBorder(element);
					position.y += topBorder(element);
				}
				var parent = element.parentNode;
				if (parent && styleString(parent, 'overflow') != 'visible'){
					position.x += leftBorder(parent);
					position.y += topBorder(parent);
				}
			} else if (element != this && Browser.safari){
				position.x += leftBorder(element);
				position.y += topBorder(element);
			}

			element = element.offsetParent;
		}
		if (Browser.firefox && !borderBox(this)){
			position.x -= leftBorder(this);
			position.y -= topBorder(this);
		}
		return position;
	},

	getPosition: function(relative){
		var offset = this.getOffsets(),
			scroll = this.getScrolls();
		var position = {
			x: offset.x - scroll.x,
			y: offset.y - scroll.y
		};

		if (relative && (relative = document.id(relative))){
			var relativePosition = relative.getPosition();
			return {x: position.x - relativePosition.x - leftBorder(relative), y: position.y - relativePosition.y - topBorder(relative)};
		}
		return position;
	},

	getCoordinates: function(element){
		if (isBody(this)) return this.getWindow().getCoordinates();
		var position = this.getPosition(element),
			size = this.getSize();
		var obj = {
			left: position.x,
			top: position.y,
			width: size.x,
			height: size.y
		};
		obj.right = obj.left + obj.width;
		obj.bottom = obj.top + obj.height;
		return obj;
	},

	computePosition: function(obj){
		return {
			left: obj.x - styleNumber(this, 'margin-left'),
			top: obj.y - styleNumber(this, 'margin-top')
		};
	},

	setPosition: function(obj){
		return this.setStyles(this.computePosition(obj));
	}

});


[Document, Window].invoke('implement', {

	getSize: function(){
		var doc = getCompatElement(this);
		return {x: doc.clientWidth, y: doc.clientHeight};
	},

	getScroll: function(){
		var win = this.getWindow(), doc = getCompatElement(this);
		return {x: win.pageXOffset || doc.scrollLeft, y: win.pageYOffset || doc.scrollTop};
	},

	getScrollSize: function(){
		var doc = getCompatElement(this),
			min = this.getSize(),
			body = this.getDocument().body;

		return {x: Math.max(doc.scrollWidth, body.scrollWidth, min.x), y: Math.max(doc.scrollHeight, body.scrollHeight, min.y)};
	},

	getPosition: function(){
		return {x: 0, y: 0};
	},

	getCoordinates: function(){
		var size = this.getSize();
		return {top: 0, left: 0, bottom: size.y, right: size.x, height: size.y, width: size.x};
	}

});

// private methods

var styleString = Element.getComputedStyle;

function styleNumber(element, style){
	return styleString(element, style).toInt() || 0;
}

function borderBox(element){
	return styleString(element, '-moz-box-sizing') == 'border-box';
}

function topBorder(element){
	return styleNumber(element, 'border-top-width');
}

function leftBorder(element){
	return styleNumber(element, 'border-left-width');
}

function isBody(element){
	return (/^(?:body|html)$/i).test(element.tagName);
}

function getCompatElement(element){
	var doc = element.getDocument();
	return (!doc.compatMode || doc.compatMode == 'CSS1Compat') ? doc.html : doc.body;
}

})();

//aliases
Element.alias({position: 'setPosition'}); //compatability

[Window, Document, Element].invoke('implement', {

	getHeight: function(){
		return this.getSize().y;
	},

	getWidth: function(){
		return this.getSize().x;
	},

	getScrollTop: function(){
		return this.getScroll().y;
	},

	getScrollLeft: function(){
		return this.getScroll().x;
	},

	getScrollHeight: function(){
		return this.getScrollSize().y;
	},

	getScrollWidth: function(){
		return this.getScrollSize().x;
	},

	getTop: function(){
		return this.getPosition().y;
	},

	getLeft: function(){
		return this.getPosition().x;
	}

});


/*
---

script: Element.Measure.js

name: Element.Measure

description: Extends the Element native object to include methods useful in measuring dimensions.

credits: "Element.measure / .expose methods by Daniel Steigerwald License: MIT-style license. Copyright: Copyright (c) 2008 Daniel Steigerwald, daniel.steigerwald.cz"

license: MIT-style license

authors:
  - Aaron Newton

requires:
  - Core/Element.Style
  - Core/Element.Dimensions
  - /MooTools.More

provides: [Element.Measure]

...
*/

(function(){

var getStylesList = function(styles, planes){
	var list = [];
	Object.each(planes, function(directions){
		Object.each(directions, function(edge){
			styles.each(function(style){
				list.push(style + '-' + edge + (style == 'border' ? '-width' : ''));
			});
		});
	});
	return list;
};

var calculateEdgeSize = function(edge, styles){
	var total = 0;
	Object.each(styles, function(value, style){
		if (style.test(edge)) total = total + value.toInt();
	});
	return total;
};

var isVisible = function(el){
	return !!(!el || el.offsetHeight || el.offsetWidth);
};


Element.implement({

	measure: function(fn){
		if (isVisible(this)) return fn.call(this);
		var parent = this.getParent(),
			toMeasure = [];
		while (!isVisible(parent) && parent != document.body){
			toMeasure.push(parent.expose());
			parent = parent.getParent();
		}
		var restore = this.expose(),
			result = fn.call(this);
		restore();
		toMeasure.each(function(restore){
			restore();
		});
		return result;
	},

	expose: function(){
		if (this.getStyle('display') != 'none') return function(){};
		var before = this.style.cssText;
		this.setStyles({
			display: 'block',
			position: 'absolute',
			visibility: 'hidden'
		});
		return function(){
			this.style.cssText = before;
		}.bind(this);
	},

	getDimensions: function(options){
		options = Object.merge({computeSize: false}, options);
		var dim = {x: 0, y: 0};

		var getSize = function(el, options){
			return (options.computeSize) ? el.getComputedSize(options) : el.getSize();
		};

		var parent = this.getParent('body');

		if (parent && this.getStyle('display') == 'none'){
			dim = this.measure(function(){
				return getSize(this, options);
			});
		} else if (parent){
			try { //safari sometimes crashes here, so catch it
				dim = getSize(this, options);
			}catch(e){}
		}

		return Object.append(dim, (dim.x || dim.x === 0) ? {
				width: dim.x,
				height: dim.y
			} : {
				x: dim.width,
				y: dim.height
			}
		);
	},

	getComputedSize: function(options){
		//<1.2compat>
		//legacy support for my stupid spelling error
		if (options && options.plains) options.planes = options.plains;
		//</1.2compat>

		options = Object.merge({
			styles: ['padding','border'],
			planes: {
				height: ['top','bottom'],
				width: ['left','right']
			},
			mode: 'both'
		}, options);

		var styles = {},
			size = {width: 0, height: 0},
			dimensions;

		if (options.mode == 'vertical'){
			delete size.width;
			delete options.planes.width;
		} else if (options.mode == 'horizontal'){
			delete size.height;
			delete options.planes.height;
		}

		getStylesList(options.styles, options.planes).each(function(style){
			styles[style] = this.getStyle(style).toInt();
		}, this);

		Object.each(options.planes, function(edges, plane){

			var capitalized = plane.capitalize(),
				style = this.getStyle(plane);

			if (style == 'auto' && !dimensions) dimensions = this.getDimensions();

			style = styles[plane] = (style == 'auto') ? dimensions[plane] : style.toInt();
			size['total' + capitalized] = style;

			edges.each(function(edge){
				var edgesize = calculateEdgeSize(edge, styles);
				size['computed' + edge.capitalize()] = edgesize;
				size['total' + capitalized] += edgesize;
			});

		}, this);

		return Object.append(size, styles);
	}

});

})();


/*
---

script: Element.Position.js

name: Element.Position

description: Extends the Element native object to include methods useful positioning elements relative to others.

license: MIT-style license

authors:
  - Aaron Newton
  - Jacob Thornton

requires:
  - Core/Options
  - Core/Element.Dimensions
  - Element.Measure

provides: [Element.Position]

...
*/

(function(original){

var local = Element.Position = {

	options: {/*
		edge: false,
		returnPos: false,
		minimum: {x: 0, y: 0},
		maximum: {x: 0, y: 0},
		relFixedPosition: false,
		ignoreMargins: false,
		ignoreScroll: false,
		allowNegative: false,*/
		relativeTo: document.body,
		position: {
			x: 'center', //left, center, right
			y: 'center' //top, center, bottom
		},
		offset: {x: 0, y: 0}
	},

	getOptions: function(element, options){
		options = Object.merge({}, local.options, options);
		local.setPositionOption(options);
		local.setEdgeOption(options);
		local.setOffsetOption(element, options);
		local.setDimensionsOption(element, options);
		return options;
	},

	setPositionOption: function(options){
		options.position = local.getCoordinateFromValue(options.position);
	},

	setEdgeOption: function(options){
		var edgeOption = local.getCoordinateFromValue(options.edge);
		options.edge = edgeOption ? edgeOption :
			(options.position.x == 'center' && options.position.y == 'center') ? {x: 'center', y: 'center'} :
			{x: 'left', y: 'top'};
	},

	setOffsetOption: function(element, options){
		var parentOffset = {x: 0, y: 0},
			offsetParent = element.measure(function(){
				return document.id(this.getOffsetParent());
			}),
			parentScroll = offsetParent ? offsetParent.getScroll() : 0;

		if (!offsetParent || offsetParent == element.getDocument().body) return;
		parentOffset = offsetParent.measure(function(){
			var position = this.getPosition();
			if (this.getStyle('position') == 'fixed'){
				var scroll = window.getScroll();
				position.x += scroll.x;
				position.y += scroll.y;
			}
			return position;
		});

		options.offset = {
			parentPositioned: offsetParent != document.id(options.relativeTo),
			x: options.offset.x - parentOffset.x + parentScroll.x,
			y: options.offset.y - parentOffset.y + parentScroll.y
		};
	},

	setDimensionsOption: function(element, options){
		options.dimensions = element.getDimensions({
			computeSize: true,
			styles: ['padding', 'border', 'margin']
		});
	},

	getPosition: function(element, options){
		var position = {};
		options = local.getOptions(element, options);
		var relativeTo = document.id(options.relativeTo) || document.body;

		local.setPositionCoordinates(options, position, relativeTo);
		if (options.edge) local.toEdge(position, options);

		var offset = options.offset;
		position.left = ((position.x >= 0 || offset.parentPositioned || options.allowNegative) ? position.x : 0).toInt();
		position.top = ((position.y >= 0 || offset.parentPositioned || options.allowNegative) ? position.y : 0).toInt();

		local.toMinMax(position, options);

		if (options.relFixedPosition || relativeTo.getStyle('position') == 'fixed') local.toRelFixedPosition(relativeTo, position);
		if (options.ignoreScroll) local.toIgnoreScroll(relativeTo, position);
		if (options.ignoreMargins) local.toIgnoreMargins(position, options);

		position.left = Math.ceil(position.left);
		position.top = Math.ceil(position.top);
		delete position.x;
		delete position.y;

		return position;
	},

	setPositionCoordinates: function(options, position, relativeTo){
		var offsetY = options.offset.y,
			offsetX = options.offset.x,
			calc = (relativeTo == document.body) ? window.getScroll() : relativeTo.getPosition(),
			top = calc.y,
			left = calc.x,
			winSize = window.getSize();

		switch(options.position.x){
			case 'left': position.x = left + offsetX; break;
			case 'right': position.x = left + offsetX + relativeTo.offsetWidth; break;
			default: position.x = left + ((relativeTo == document.body ? winSize.x : relativeTo.offsetWidth) / 2) + offsetX; break;
		}

		switch(options.position.y){
			case 'top': position.y = top + offsetY; break;
			case 'bottom': position.y = top + offsetY + relativeTo.offsetHeight; break;
			default: position.y = top + ((relativeTo == document.body ? winSize.y : relativeTo.offsetHeight) / 2) + offsetY; break;
		}
	},

	toMinMax: function(position, options){
		var xy = {left: 'x', top: 'y'}, value;
		['minimum', 'maximum'].each(function(minmax){
			['left', 'top'].each(function(lr){
				value = options[minmax] ? options[minmax][xy[lr]] : null;
				if (value != null && ((minmax == 'minimum') ? position[lr] < value : position[lr] > value)) position[lr] = value;
			});
		});
	},

	toRelFixedPosition: function(relativeTo, position){
		var winScroll = window.getScroll();
		position.top += winScroll.y;
		position.left += winScroll.x;
	},

	toIgnoreScroll: function(relativeTo, position){
		var relScroll = relativeTo.getScroll();
		position.top -= relScroll.y;
		position.left -= relScroll.x;
	},

	toIgnoreMargins: function(position, options){
		position.left += options.edge.x == 'right'
			? options.dimensions['margin-right']
			: (options.edge.x != 'center'
				? -options.dimensions['margin-left']
				: -options.dimensions['margin-left'] + ((options.dimensions['margin-right'] + options.dimensions['margin-left']) / 2));

		position.top += options.edge.y == 'bottom'
			? options.dimensions['margin-bottom']
			: (options.edge.y != 'center'
				? -options.dimensions['margin-top']
				: -options.dimensions['margin-top'] + ((options.dimensions['margin-bottom'] + options.dimensions['margin-top']) / 2));
	},

	toEdge: function(position, options){
		var edgeOffset = {},
			dimensions = options.dimensions,
			edge = options.edge;

		switch(edge.x){
			case 'left': edgeOffset.x = 0; break;
			case 'right': edgeOffset.x = -dimensions.x - dimensions.computedRight - dimensions.computedLeft; break;
			// center
			default: edgeOffset.x = -(Math.round(dimensions.totalWidth / 2)); break;
		}

		switch(edge.y){
			case 'top': edgeOffset.y = 0; break;
			case 'bottom': edgeOffset.y = -dimensions.y - dimensions.computedTop - dimensions.computedBottom; break;
			// center
			default: edgeOffset.y = -(Math.round(dimensions.totalHeight / 2)); break;
		}

		position.x += edgeOffset.x;
		position.y += edgeOffset.y;
	},

	getCoordinateFromValue: function(option){
		if (typeOf(option) != 'string') return option;
		option = option.toLowerCase();

		return {
			x: option.test('left') ? 'left'
				: (option.test('right') ? 'right' : 'center'),
			y: option.test(/upper|top/) ? 'top'
				: (option.test('bottom') ? 'bottom' : 'center')
		};
	}

};

Element.implement({

	position: function(options){
		if (options && (options.x != null || options.y != null)){
			return (original ? original.apply(this, arguments) : this);
		}
		var position = this.setStyle('position', 'absolute').calculatePosition(options);
		return (options && options.returnPos) ? position : this.setStyles(position);
	},

	calculatePosition: function(options){
		return local.getPosition(this, options);
	}

});

})(Element.prototype.position);


/*
---

script: Class.Occlude.js

name: Class.Occlude

description: Prevents a class from being applied to a DOM element twice.

license: MIT-style license.

authors:
  - Aaron Newton

requires:
  - Core/Class
  - Core/Element
  - /MooTools.More

provides: [Class.Occlude]

...
*/

Class.Occlude = new Class({

	occlude: function(property, element){
		element = document.id(element || this.element);
		var instance = element.retrieve(property || this.property);
		if (instance && !this.occluded)
			return (this.occluded = instance);

		this.occluded = false;
		element.store(property || this.property, this);
		return this.occluded;
	}

});


/*
---

script: IframeShim.js

name: IframeShim

description: Defines IframeShim, a class for obscuring select lists and flash objects in IE.

license: MIT-style license

authors:
  - Aaron Newton

requires:
  - Core/Element.Event
  - Core/Element.Style
  - Core/Options
  - Core/Events
  - /Element.Position
  - /Class.Occlude

provides: [IframeShim]

...
*/

var IframeShim = new Class({

	Implements: [Options, Events, Class.Occlude],

	options: {
		className: 'iframeShim',
		src: 'javascript:false;document.write("");',
		display: false,
		zIndex: null,
		margin: 0,
		offset: {x: 0, y: 0},
		browsers: (Browser.ie6 || (Browser.firefox && Browser.version < 3 && Browser.Platform.mac))
	},

	property: 'IframeShim',

	initialize: function(element, options){
		this.element = document.id(element);
		if (this.occlude()) return this.occluded;
		this.setOptions(options);
		this.makeShim();
		return this;
	},

	makeShim: function(){
		if (this.options.browsers){
			var zIndex = this.element.getStyle('zIndex').toInt();

			if (!zIndex){
				zIndex = 1;
				var pos = this.element.getStyle('position');
				if (pos == 'static' || !pos) this.element.setStyle('position', 'relative');
				this.element.setStyle('zIndex', zIndex);
			}
			zIndex = ((this.options.zIndex != null || this.options.zIndex === 0) && zIndex > this.options.zIndex) ? this.options.zIndex : zIndex - 1;
			if (zIndex < 0) zIndex = 1;
			this.shim = new Element('iframe', {
				src: this.options.src,
				scrolling: 'no',
				frameborder: 0,
				styles: {
					zIndex: zIndex,
					position: 'absolute',
					border: 'none',
					filter: 'progid:DXImageTransform.Microsoft.Alpha(style=0,opacity=0)'
				},
				'class': this.options.className
			}).store('IframeShim', this);
			var inject = (function(){
				this.shim.inject(this.element, 'after');
				this[this.options.display ? 'show' : 'hide']();
				this.fireEvent('inject');
			}).bind(this);
			if (!IframeShim.ready) window.addEvent('load', inject);
			else inject();
		} else {
			this.position = this.hide = this.show = this.dispose = Function.from(this);
		}
	},

	position: function(){
		if (!IframeShim.ready || !this.shim) return this;
		var size = this.element.measure(function(){
			return this.getSize();
		});
		if (this.options.margin != undefined){
			size.x = size.x - (this.options.margin * 2);
			size.y = size.y - (this.options.margin * 2);
			this.options.offset.x += this.options.margin;
			this.options.offset.y += this.options.margin;
		}
		this.shim.set({width: size.x, height: size.y}).position({
			relativeTo: this.element,
			offset: this.options.offset
		});
		return this;
	},

	hide: function(){
		if (this.shim) this.shim.setStyle('display', 'none');
		return this;
	},

	show: function(){
		if (this.shim) this.shim.setStyle('display', 'block');
		return this.position();
	},

	dispose: function(){
		if (this.shim) this.shim.dispose();
		return this;
	},

	destroy: function(){
		if (this.shim) this.shim.destroy();
		return this;
	}

});

window.addEvent('load', function(){
	IframeShim.ready = true;
});


/*
---

script: Mask.js

name: Mask

description: Creates a mask element to cover another.

license: MIT-style license

authors:
  - Aaron Newton

requires:
  - Core/Options
  - Core/Events
  - Core/Element.Event
  - /Class.Binds
  - /Element.Position
  - /IframeShim

provides: [Mask]

...
*/

var Mask = new Class({

	Implements: [Options, Events],

	Binds: ['position'],

	options: {/*
		onShow: function(){},
		onHide: function(){},
		onDestroy: function(){},
		onClick: function(event){},
		inject: {
			where: 'after',
			target: null,
		},
		hideOnClick: false,
		id: null,
		destroyOnHide: false,*/
		style: {},
		'class': 'mask',
		maskMargins: false,
		useIframeShim: true,
		iframeShimOptions: {}
	},

	initialize: function(target, options){
		this.target = document.id(target) || document.id(document.body);
		this.target.store('mask', this);
		this.setOptions(options);
		this.render();
		this.inject();
	},

	render: function(){
		this.element = new Element('div', {
			'class': this.options['class'],
			id: this.options.id || 'mask-' + String.uniqueID(),
			styles: Object.merge({}, this.options.style, {
				display: 'none'
			}),
			events: {
				click: function(event){
					this.fireEvent('click', event);
					if (this.options.hideOnClick) this.hide();
				}.bind(this)
			}
		});

		this.hidden = true;
	},

	toElement: function(){
		return this.element;
	},

	inject: function(target, where){
		where = where || (this.options.inject ? this.options.inject.where : '') || this.target == document.body ? 'inside' : 'after';
		target = target || (this.options.inject && this.options.inject.target) || this.target;

		this.element.inject(target, where);

		if (this.options.useIframeShim){
			this.shim = new IframeShim(this.element, this.options.iframeShimOptions);

			this.addEvents({
				show: this.shim.show.bind(this.shim),
				hide: this.shim.hide.bind(this.shim),
				destroy: this.shim.destroy.bind(this.shim)
			});
		}
	},

	position: function(){
		this.resize(this.options.width, this.options.height);

		this.element.position({
			relativeTo: this.target,
			position: 'topLeft',
			ignoreMargins: !this.options.maskMargins,
			ignoreScroll: this.target == document.body
		});

		return this;
	},

	resize: function(x, y){
		var opt = {
			styles: ['padding', 'border']
		};
		if (this.options.maskMargins) opt.styles.push('margin');

		var dim = this.target.getComputedSize(opt);
		if (this.target == document.body){
			this.element.setStyles({width: 0, height: 0});
			var win = window.getScrollSize();
			if (dim.totalHeight < win.y) dim.totalHeight = win.y;
			if (dim.totalWidth < win.x) dim.totalWidth = win.x;
		}
		this.element.setStyles({
			width: Array.pick([x, dim.totalWidth, dim.x]),
			height: Array.pick([y, dim.totalHeight, dim.y])
		});

		return this;
	},

	show: function(){
		if (!this.hidden) return this;

		window.addEvent('resize', this.position);
		this.position();
		this.showMask.apply(this, arguments);

		return this;
	},

	showMask: function(){
		this.element.setStyle('display', 'block');
		this.hidden = false;
		this.fireEvent('show');
	},

	hide: function(){
		if (this.hidden) return this;

		window.removeEvent('resize', this.position);
		this.hideMask.apply(this, arguments);
		if (this.options.destroyOnHide) return this.destroy();

		return this;
	},

	hideMask: function(){
		this.element.setStyle('display', 'none');
		this.hidden = true;
		this.fireEvent('hide');
	},

	toggle: function(){
		this[this.hidden ? 'show' : 'hide']();
	},

	destroy: function(){
		this.hide();
		this.element.destroy();
		this.fireEvent('destroy');
		this.target.eliminate('mask');
	}

});

Element.Properties.mask = {

	set: function(options){
		var mask = this.retrieve('mask');
		if (mask) mask.destroy();
		return this.eliminate('mask').store('mask:options', options);
	},

	get: function(){
		var mask = this.retrieve('mask');
		if (!mask){
			mask = new Mask(this, this.retrieve('mask:options'));
			this.store('mask', mask);
		}
		return mask;
	}

};

Element.implement({

	mask: function(options){
		if (options) this.set('mask', options);
		this.get('mask').show();
		return this;
	},

	unmask: function(){
		this.get('mask').hide();
		return this;
	}

});


/*
---
description: Provides methods to add/remove/toggle a class on a given target.
provides: [Delegator.ToggleClass, Delegator.AddClass, Delegator.RemoveClass, Delegator.AddRemoveClass]
requires: [Behavior/Delegator, Core/Element]
script: Delegator.AddRemoveClass.js
name: Delegator.AddRemoveClass

...
*/
(function(){

	var triggers = {};

	['add', 'remove', 'toggle'].each(function(action){

		triggers[action + 'Class'] = {
			require: ['class'],
			handler: function(event, link, api){
				var target = link;
				if (api.get('target')) {
					target = link.getElement(api.get('target'));
					if (!target) api.fail('could not locate target element to ' + action + ' its class', link);
				}
				target[action + 'Class'](api.get('class'));
			}
		};

	});

	Delegator.register('click', triggers);

})();

/*
---

name: Fx

description: Contains the basic animation logic to be extended by all other Fx Classes.

license: MIT-style license.

requires: [Chain, Events, Options]

provides: Fx

...
*/

(function(){

var Fx = this.Fx = new Class({

	Implements: [Chain, Events, Options],

	options: {
		/*
		onStart: nil,
		onCancel: nil,
		onComplete: nil,
		*/
		fps: 60,
		unit: false,
		duration: 500,
		frames: null,
		frameSkip: true,
		link: 'ignore'
	},

	initialize: function(options){
		this.subject = this.subject || this;
		this.setOptions(options);
	},

	getTransition: function(){
		return function(p){
			return -(Math.cos(Math.PI * p) - 1) / 2;
		};
	},

	step: function(now){
		if (this.options.frameSkip){
			var diff = (this.time != null) ? (now - this.time) : 0, frames = diff / this.frameInterval;
			this.time = now;
			this.frame += frames;
		} else {
			this.frame++;
		}

		if (this.frame < this.frames){
			var delta = this.transition(this.frame / this.frames);
			this.set(this.compute(this.from, this.to, delta));
		} else {
			this.frame = this.frames;
			this.set(this.compute(this.from, this.to, 1));
			this.stop();
		}
	},

	set: function(now){
		return now;
	},

	compute: function(from, to, delta){
		return Fx.compute(from, to, delta);
	},

	check: function(){
		if (!this.isRunning()) return true;
		switch (this.options.link){
			case 'cancel': this.cancel(); return true;
			case 'chain': this.chain(this.caller.pass(arguments, this)); return false;
		}
		return false;
	},

	start: function(from, to){
		if (!this.check(from, to)) return this;
		this.from = from;
		this.to = to;
		this.frame = (this.options.frameSkip) ? 0 : -1;
		this.time = null;
		this.transition = this.getTransition();
		var frames = this.options.frames, fps = this.options.fps, duration = this.options.duration;
		this.duration = Fx.Durations[duration] || duration.toInt();
		this.frameInterval = 1000 / fps;
		this.frames = frames || Math.round(this.duration / this.frameInterval);
		this.fireEvent('start', this.subject);
		pushInstance.call(this, fps);
		return this;
	},

	stop: function(){
		if (this.isRunning()){
			this.time = null;
			pullInstance.call(this, this.options.fps);
			if (this.frames == this.frame){
				this.fireEvent('complete', this.subject);
				if (!this.callChain()) this.fireEvent('chainComplete', this.subject);
			} else {
				this.fireEvent('stop', this.subject);
			}
		}
		return this;
	},

	cancel: function(){
		if (this.isRunning()){
			this.time = null;
			pullInstance.call(this, this.options.fps);
			this.frame = this.frames;
			this.fireEvent('cancel', this.subject).clearChain();
		}
		return this;
	},

	pause: function(){
		if (this.isRunning()){
			this.time = null;
			pullInstance.call(this, this.options.fps);
		}
		return this;
	},

	resume: function(){
		if ((this.frame < this.frames) && !this.isRunning()) pushInstance.call(this, this.options.fps);
		return this;
	},

	isRunning: function(){
		var list = instances[this.options.fps];
		return list && list.contains(this);
	}

});

Fx.compute = function(from, to, delta){
	return (to - from) * delta + from;
};

Fx.Durations = {'short': 250, 'normal': 500, 'long': 1000};

// global timers

var instances = {}, timers = {};

var loop = function(){
	var now = Date.now();
	for (var i = this.length; i--;){
		var instance = this[i];
		if (instance) instance.step(now);
	}
};

var pushInstance = function(fps){
	var list = instances[fps] || (instances[fps] = []);
	list.push(this);
	if (!timers[fps]) timers[fps] = loop.periodical(Math.round(1000 / fps), list);
};

var pullInstance = function(fps){
	var list = instances[fps];
	if (list){
		list.erase(this);
		if (!list.length && timers[fps]){
			delete instances[fps];
			timers[fps] = clearInterval(timers[fps]);
		}
	}
};

})();


/*
---

name: Fx.CSS

description: Contains the CSS animation logic. Used by Fx.Tween, Fx.Morph, Fx.Elements.

license: MIT-style license.

requires: [Fx, Element.Style]

provides: Fx.CSS

...
*/

Fx.CSS = new Class({

	Extends: Fx,

	//prepares the base from/to object

	prepare: function(element, property, values){
		values = Array.from(values);
		if (values[1] == null){
			values[1] = values[0];
			values[0] = element.getStyle(property);
		}
		var parsed = values.map(this.parse);
		return {from: parsed[0], to: parsed[1]};
	},

	//parses a value into an array

	parse: function(value){
		value = Function.from(value)();
		value = (typeof value == 'string') ? value.split(' ') : Array.from(value);
		return value.map(function(val){
			val = String(val);
			var found = false;
			Object.each(Fx.CSS.Parsers, function(parser, key){
				if (found) return;
				var parsed = parser.parse(val);
				if (parsed || parsed === 0) found = {value: parsed, parser: parser};
			});
			found = found || {value: val, parser: Fx.CSS.Parsers.String};
			return found;
		});
	},

	//computes by a from and to prepared objects, using their parsers.

	compute: function(from, to, delta){
		var computed = [];
		(Math.min(from.length, to.length)).times(function(i){
			computed.push({value: from[i].parser.compute(from[i].value, to[i].value, delta), parser: from[i].parser});
		});
		computed.$family = Function.from('fx:css:value');
		return computed;
	},

	//serves the value as settable

	serve: function(value, unit){
		if (typeOf(value) != 'fx:css:value') value = this.parse(value);
		var returned = [];
		value.each(function(bit){
			returned = returned.concat(bit.parser.serve(bit.value, unit));
		});
		return returned;
	},

	//renders the change to an element

	render: function(element, property, value, unit){
		element.setStyle(property, this.serve(value, unit));
	},

	//searches inside the page css to find the values for a selector

	search: function(selector){
		if (Fx.CSS.Cache[selector]) return Fx.CSS.Cache[selector];
		var to = {}, selectorTest = new RegExp('^' + selector.escapeRegExp() + '$');
		Array.each(document.styleSheets, function(sheet, j){
			var href = sheet.href;
			if (href && href.contains('://') && !href.contains(document.domain)) return;
			var rules = sheet.rules || sheet.cssRules;
			Array.each(rules, function(rule, i){
				if (!rule.style) return;
				var selectorText = (rule.selectorText) ? rule.selectorText.replace(/^\w+/, function(m){
					return m.toLowerCase();
				}) : null;
				if (!selectorText || !selectorTest.test(selectorText)) return;
				Object.each(Element.Styles, function(value, style){
					if (!rule.style[style] || Element.ShortStyles[style]) return;
					value = String(rule.style[style]);
					to[style] = ((/^rgb/).test(value)) ? value.rgbToHex() : value;
				});
			});
		});
		return Fx.CSS.Cache[selector] = to;
	}

});

Fx.CSS.Cache = {};

Fx.CSS.Parsers = {

	Color: {
		parse: function(value){
			if (value.match(/^#[0-9a-f]{3,6}$/i)) return value.hexToRgb(true);
			return ((value = value.match(/(\d+),\s*(\d+),\s*(\d+)/))) ? [value[1], value[2], value[3]] : false;
		},
		compute: function(from, to, delta){
			return from.map(function(value, i){
				return Math.round(Fx.compute(from[i], to[i], delta));
			});
		},
		serve: function(value){
			return value.map(Number);
		}
	},

	Number: {
		parse: parseFloat,
		compute: Fx.compute,
		serve: function(value, unit){
			return (unit) ? value + unit : value;
		}
	},

	String: {
		parse: Function.from(false),
		compute: function(zero, one){
			return one;
		},
		serve: function(zero){
			return zero;
		}
	}

};

//<1.2compat>

Fx.CSS.Parsers = new Hash(Fx.CSS.Parsers);

//</1.2compat>


/*
---

script: Fx.Elements.js

name: Fx.Elements

description: Effect to change any number of CSS properties of any number of Elements.

license: MIT-style license

authors:
  - Valerio Proietti

requires:
  - Core/Fx.CSS
  - /MooTools.More

provides: [Fx.Elements]

...
*/

Fx.Elements = new Class({

	Extends: Fx.CSS,

	initialize: function(elements, options){
		this.elements = this.subject = $$(elements);
		this.parent(options);
	},

	compute: function(from, to, delta){
		var now = {};

		for (var i in from){
			var iFrom = from[i], iTo = to[i], iNow = now[i] = {};
			for (var p in iFrom) iNow[p] = this.parent(iFrom[p], iTo[p], delta);
		}

		return now;
	},

	set: function(now){
		for (var i in now){
			if (!this.elements[i]) continue;

			var iNow = now[i];
			for (var p in iNow) this.render(this.elements[i], p, iNow[p], this.options.unit);
		}

		return this;
	},

	start: function(obj){
		if (!this.check(obj)) return this;
		var from = {}, to = {};

		for (var i in obj){
			if (!this.elements[i]) continue;

			var iProps = obj[i], iFrom = from[i] = {}, iTo = to[i] = {};

			for (var p in iProps){
				var parsed = this.prepare(this.elements[i], p, iProps[p]);
				iFrom[p] = parsed.from;
				iTo[p] = parsed.to;
			}
		}

		return this.parent(from, to);
	}

});


/*
---

script: Fx.Accordion.js

name: Fx.Accordion

description: An Fx.Elements extension which allows you to easily create accordion type controls.

license: MIT-style license

authors:
  - Valerio Proietti

requires:
  - Core/Element.Event
  - /Fx.Elements

provides: [Fx.Accordion]

...
*/

Fx.Accordion = new Class({

	Extends: Fx.Elements,

	options: {/*
		onActive: function(toggler, section){},
		onBackground: function(toggler, section){},*/
		fixedHeight: false,
		fixedWidth: false,
		display: 0,
		show: false,
		height: true,
		width: false,
		opacity: true,
		alwaysHide: false,
		trigger: 'click',
		initialDisplayFx: true,
		resetHeight: true
	},

	initialize: function(){
		var defined = function(obj){
			return obj != null;
		};

		var params = Array.link(arguments, {
			'container': Type.isElement, //deprecated
			'options': Type.isObject,
			'togglers': defined,
			'elements': defined
		});
		this.parent(params.elements, params.options);

		var options = this.options,
			togglers = this.togglers = $$(params.togglers);

		this.previous = -1;
		this.internalChain = new Chain();

		if (options.alwaysHide) this.options.link = 'chain';

		if (options.show || this.options.show === 0){
			options.display = false;
			this.previous = options.show;
		}

		if (options.start){
			options.display = false;
			options.show = false;
		}

		var effects = this.effects = {};

		if (options.opacity) effects.opacity = 'fullOpacity';
		if (options.width) effects.width = options.fixedWidth ? 'fullWidth' : 'offsetWidth';
		if (options.height) effects.height = options.fixedHeight ? 'fullHeight' : 'scrollHeight';

		for (var i = 0, l = togglers.length; i < l; i++) this.addSection(togglers[i], this.elements[i]);

		this.elements.each(function(el, i){
			if (options.show === i){
				this.fireEvent('active', [togglers[i], el]);
			} else {
				for (var fx in effects) el.setStyle(fx, 0);
			}
		}, this);

		if (options.display || options.display === 0 || options.initialDisplayFx === false){
			this.display(options.display, options.initialDisplayFx);
		}

		if (options.fixedHeight !== false) options.resetHeight = false;
		this.addEvent('complete', this.internalChain.callChain.bind(this.internalChain));
	},

	addSection: function(toggler, element){
		toggler = document.id(toggler);
		element = document.id(element);
		this.togglers.include(toggler);
		this.elements.include(element);

		var togglers = this.togglers,
			options = this.options,
			test = togglers.contains(toggler),
			idx = togglers.indexOf(toggler),
			displayer = this.display.pass(idx, this);

		toggler.store('accordion:display', displayer)
			.addEvent(options.trigger, displayer);

		if (options.height) element.setStyles({'padding-top': 0, 'border-top': 'none', 'padding-bottom': 0, 'border-bottom': 'none'});
		if (options.width) element.setStyles({'padding-left': 0, 'border-left': 'none', 'padding-right': 0, 'border-right': 'none'});

		element.fullOpacity = 1;
		if (options.fixedWidth) element.fullWidth = options.fixedWidth;
		if (options.fixedHeight) element.fullHeight = options.fixedHeight;
		element.setStyle('overflow', 'hidden');

		if (!test) for (var fx in this.effects){
			element.setStyle(fx, 0);
		}
		return this;
	},

	removeSection: function(toggler, displayIndex){
		var togglers = this.togglers,
			idx = togglers.indexOf(toggler),
			element = this.elements[idx];

		var remover = function(){
			togglers.erase(toggler);
			this.elements.erase(element);
			this.detach(toggler);
		}.bind(this);

		if (this.now == idx || displayIndex != null){
			this.display(displayIndex != null ? displayIndex : (idx - 1 >= 0 ? idx - 1 : 0)).chain(remover);
		} else {
			remover();
		}
		return this;
	},

	detach: function(toggler){
		var remove = function(toggler){
			toggler.removeEvent(this.options.trigger, toggler.retrieve('accordion:display'));
		}.bind(this);

		if (!toggler) this.togglers.each(remove);
		else remove(toggler);
		return this;
	},

	display: function(index, useFx){
		if (!this.check(index, useFx)) return this;

		var obj = {},
			elements = this.elements,
			options = this.options,
			effects = this.effects;

		if (useFx == null) useFx = true;
		if (typeOf(index) == 'element') index = elements.indexOf(index);
		if (index == this.previous && !options.alwaysHide) return this;

		if (options.resetHeight){
			var prev = elements[this.previous];
			if (prev && !this.selfHidden){
				for (var fx in effects) prev.setStyle(fx, prev[effects[fx]]);
			}
		}

		if ((this.timer && options.link == 'chain') || (index === this.previous && !options.alwaysHide)) return this;

		this.previous = index;
		this.selfHidden = false;

		elements.each(function(el, i){
			obj[i] = {};
			var hide;
			if (i != index){
				hide = true;
			} else if (options.alwaysHide && ((el.offsetHeight > 0 && options.height) || el.offsetWidth > 0 && options.width)){
				hide = true;
				this.selfHidden = true;
			}
			this.fireEvent(hide ? 'background' : 'active', [this.togglers[i], el]);
			for (var fx in effects) obj[i][fx] = hide ? 0 : el[effects[fx]];
			if (!useFx && !hide && options.resetHeight) obj[i].height = 'auto';
		}, this);

		this.internalChain.clearChain();
		this.internalChain.chain(function(){
			if (options.resetHeight && !this.selfHidden){
				var el = elements[index];
				if (el) el.setStyle('height', 'auto');
			}
		}.bind(this));

		return useFx ? this.start(obj) : this.set(obj).internalChain.callChain();
	}

});

/*<1.2compat>*/
/*
	Compatibility with 1.2.0
*/
var Accordion = new Class({

	Extends: Fx.Accordion,

	initialize: function(){
		this.parent.apply(this, arguments);
		var params = Array.link(arguments, {'container': Type.isElement});
		this.container = params.container;
	},

	addSection: function(toggler, element, pos){
		toggler = document.id(toggler);
		element = document.id(element);

		var test = this.togglers.contains(toggler);
		var len = this.togglers.length;
		if (len && (!test || pos)){
			pos = pos != null ? pos : len - 1;
			toggler.inject(this.togglers[pos], 'before');
			element.inject(toggler, 'after');
		} else if (this.container && !test){
			toggler.inject(this.container);
			element.inject(this.container);
		}
		return this.parent.apply(this, arguments);
	}

});
/*</1.2compat>*/


/*
---

script: Object.Extras.js

name: Object.Extras

description: Extra Object generics, like getFromPath which allows a path notation to child elements.

license: MIT-style license

authors:
  - Aaron Newton

requires:
  - Core/Object
  - /MooTools.More

provides: [Object.Extras]

...
*/

(function(){

var defined = function(value){
	return value != null;
};

var hasOwnProperty = Object.prototype.hasOwnProperty;

Object.extend({

	getFromPath: function(source, parts){
		if (typeof parts == 'string') parts = parts.split('.');
		for (var i = 0, l = parts.length; i < l; i++){
			if (hasOwnProperty.call(source, parts[i])) source = source[parts[i]];
			else return null;
		}
		return source;
	},

	cleanValues: function(object, method){
		method = method || defined;
		for (var key in object) if (!method(object[key])){
			delete object[key];
		}
		return object;
	},

	erase: function(object, key){
		if (hasOwnProperty.call(object, key)) delete object[key];
		return object;
	},

	run: function(object){
		var args = Array.slice(arguments, 1);
		for (var key in object) if (object[key].apply){
			object[key].apply(object, args);
		}
		return object;
	}

});

})();


/*
---
description: Creates an Fx.Accordion from any element with Accordion in its data-behavior property.  Uses the .toggle elements within the element as the toggles and the .target elements as the targets. 
provides: [Behavior.Accordion, Behavior.FxAccordion]
requires: [Behavior/Behavior, More/Fx.Accordion, Behavior/Element.Data, More/Object.Extras]
script: Behavior.Accordion.js
name: Behavior.Accordion
...
*/

Behavior.addGlobalFilter('Accordion', {
	deprecated: {
		headers:'toggler-elements',
		sections:'section-elements'
	},
	defaults: {
		// defaults from Fx.Accordion:
		display: 0,
		height: true,
		width: false,
		opacity: true,
		alwaysHide: false,
		trigger: 'click',
		initialDisplayFx: true,
		resetHeight: true,
		headers: '.header',
		sections: '.section'
	},
	setup: function(element, api){
		var options = Object.cleanValues(
			api.getAs({
				fixedHeight: Number,
				fixedWidth: Number,
				display: Number,
				show: Number,
				height: Boolean,
				width: Boolean,
				opacity: Boolean,
				alwaysHide: Boolean,
				trigger: String,
				initialDisplayFx: Boolean,
				resetHeight: Boolean
			})
		);
		var accordion = new Fx.Accordion(element.getElements(api.get('headers')), element.getElements(api.get('sections')), options);
		api.onCleanup(accordion.detach.bind(accordion));
		return accordion;
	}
});

/*
---

name: Fx.Tween

description: Formerly Fx.Style, effect to transition any CSS property for an element.

license: MIT-style license.

requires: Fx.CSS

provides: [Fx.Tween, Element.fade, Element.highlight]

...
*/

Fx.Tween = new Class({

	Extends: Fx.CSS,

	initialize: function(element, options){
		this.element = this.subject = document.id(element);
		this.parent(options);
	},

	set: function(property, now){
		if (arguments.length == 1){
			now = property;
			property = this.property || this.options.property;
		}
		this.render(this.element, property, now, this.options.unit);
		return this;
	},

	start: function(property, from, to){
		if (!this.check(property, from, to)) return this;
		var args = Array.flatten(arguments);
		this.property = this.options.property || args.shift();
		var parsed = this.prepare(this.element, this.property, args);
		return this.parent(parsed.from, parsed.to);
	}

});

Element.Properties.tween = {

	set: function(options){
		this.get('tween').cancel().setOptions(options);
		return this;
	},

	get: function(){
		var tween = this.retrieve('tween');
		if (!tween){
			tween = new Fx.Tween(this, {link: 'cancel'});
			this.store('tween', tween);
		}
		return tween;
	}

};

Element.implement({

	tween: function(property, from, to){
		this.get('tween').start(property, from, to);
		return this;
	},

	fade: function(how){
		var fade = this.get('tween'), method, to, toggle;
		if (how == null) how = 'toggle';
		switch (how){
			case 'in': method = 'start'; to = 1; break;
			case 'out': method = 'start'; to = 0; break;
			case 'show': method = 'set'; to = 1; break;
			case 'hide': method = 'set'; to = 0; break;
			case 'toggle':
				var flag = this.retrieve('fade:flag', this.getStyle('opacity') == 1);
				method = 'start';
				to = flag ? 0 : 1;
				this.store('fade:flag', !flag);
				toggle = true;
			break;
			default: method = 'start'; to = how;
		}
		if (!toggle) this.eliminate('fade:flag');
		fade[method]('opacity', to);
		if (method == 'set' || to != 0) this.setStyle('visibility', to == 0 ? 'hidden' : 'visible');
		else fade.chain(function(){
			this.element.setStyle('visibility', 'hidden');
		});
		return this;
	},

	highlight: function(start, end){
		if (!end){
			end = this.retrieve('highlight:original', this.getStyle('background-color'));
			end = (end == 'transparent') ? '#fff' : end;
		}
		var tween = this.get('tween');
		tween.start('background-color', start || '#ffff88', end).chain(function(){
			this.setStyle('background-color', this.retrieve('highlight:original'));
			tween.callChain();
		}.bind(this));
		return this;
	}

});


/*
---

name: Fx.Morph

description: Formerly Fx.Styles, effect to transition any number of CSS properties for an element using an object of rules, or CSS based selector rules.

license: MIT-style license.

requires: Fx.CSS

provides: Fx.Morph

...
*/

Fx.Morph = new Class({

	Extends: Fx.CSS,

	initialize: function(element, options){
		this.element = this.subject = document.id(element);
		this.parent(options);
	},

	set: function(now){
		if (typeof now == 'string') now = this.search(now);
		for (var p in now) this.render(this.element, p, now[p], this.options.unit);
		return this;
	},

	compute: function(from, to, delta){
		var now = {};
		for (var p in from) now[p] = this.parent(from[p], to[p], delta);
		return now;
	},

	start: function(properties){
		if (!this.check(properties)) return this;
		if (typeof properties == 'string') properties = this.search(properties);
		var from = {}, to = {};
		for (var p in properties){
			var parsed = this.prepare(this.element, p, properties[p]);
			from[p] = parsed.from;
			to[p] = parsed.to;
		}
		return this.parent(from, to);
	}

});

Element.Properties.morph = {

	set: function(options){
		this.get('morph').cancel().setOptions(options);
		return this;
	},

	get: function(){
		var morph = this.retrieve('morph');
		if (!morph){
			morph = new Fx.Morph(this, {link: 'cancel'});
			this.store('morph', morph);
		}
		return morph;
	}

};

Element.implement({

	morph: function(props){
		this.get('morph').start(props);
		return this;
	}

});


/*
---

script: Element.Shortcuts.js

name: Element.Shortcuts

description: Extends the Element native object to include some shortcut methods.

license: MIT-style license

authors:
  - Aaron Newton

requires:
  - Core/Element.Style
  - /MooTools.More

provides: [Element.Shortcuts]

...
*/

Element.implement({

	isDisplayed: function(){
		return this.getStyle('display') != 'none';
	},

	isVisible: function(){
		var w = this.offsetWidth,
			h = this.offsetHeight;
		return (w == 0 && h == 0) ? false : (w > 0 && h > 0) ? true : this.style.display != 'none';
	},

	toggle: function(){
		return this[this.isDisplayed() ? 'hide' : 'show']();
	},

	hide: function(){
		var d;
		try {
			//IE fails here if the element is not in the dom
			d = this.getStyle('display');
		} catch(e){}
		if (d == 'none') return this;
		if (!this.hasClass('keyword') && !this.hasClass('footnote') && !this.hasClass('noteref') && !this.hasClass('noteref_endnote')) {
			return this.store('element:_originalDisplay', d || '').setStyle('display', 'none');
		}
	},

	show: function(display){
		if (!display && this.isDisplayed()) return this;
		display = display || this.retrieve('element:_originalDisplay') || 'block';
		return this.setStyle('display', (display == 'none') ? 'block' : display);
	},

	swapClass: function(remove, add){
		return this.removeClass(remove).addClass(add);
	}

});

Document.implement({

	clearSelection: function(){
		if (window.getSelection){
			var selection = window.getSelection();
			if (selection && selection.removeAllRanges) selection.removeAllRanges();
		} else if (document.selection && document.selection.empty){
			try {
				//IE fails here if selected element is not in dom
				document.selection.empty();
			} catch(e){}
		}
	}

});


/*
---

name: TabSwapper

description: Handles the scripting for a common UI layout; the tabbed box.

license: MIT-Style License

requires: [Core/Element.Event, Core/Fx.Tween, Core/Fx.Morph, Core/Element.Dimensions, More/Element.Shortcuts, More/Element.Measure]

provides: TabSwapper

...
*/
var TabSwapper = new Class({
	Implements: [Options, Events],
	options: {
		// initPanel: null,
		// smooth: false,
		// smoothSize: false,
		// maxSize: null,
		// onActive: function(){},
		// onActiveAfterFx: function(){},
		// onBackground: function(){}
		// cookieName: null,
		selectedClass: 'tabSelected',
		mouseoverClass: 'tabOver',
		deselectedClass: '',
		rearrangeDOM: true,
		effectOptions: {
			duration: 500
		},
		cookieDays: 999
	},
	tabs: [],
	sections: [],
	clickers: [],
	sectionFx: [],
	initialize: function(options){
		this.setOptions(options);
		var prev = this.setup();
		if (prev) return prev;
		if (this.options.initPanel != null) this.show(this.options.initPanel);
		else if (this.options.cookieName && this.recall()) this.show(this.recall().toInt());
		else this.show(0);

	},
	setup: function(){
		var opt = this.options,
		    sections = $$(opt.sections),
		    tabs = $$(opt.tabs);
		if (tabs[0] && tabs[0].retrieve('tabSwapper')) return tabs[0].retrieve('tabSwapper');
		var clickers = $$(opt.clickers);
		tabs.each(function(tab, index){
			this.addTab(tab, sections[index], clickers[index], index);
		}, this);
	},
	addTab: function(tab, section, clicker, index){
		tab = document.id(tab); clicker = document.id(clicker); section = document.id(section);
		//if the tab is already in the interface, just move it
		if (this.tabs.indexOf(tab) >= 0 && tab.retrieve('tabbered')
			 && this.tabs.indexOf(tab) != index && this.options.rearrangeDOM) {
			this.moveTab(this.tabs.indexOf(tab), index);
			return this;
		}
		//if the index isn't specified, put the tab at the end
		if (index == null) index = this.tabs.length;
		//if this isn't the first item, and there's a tab
		//already in the interface at the index 1 less than this
		//insert this after that one
		if (index > 0 && this.tabs[index-1] && this.options.rearrangeDOM) {
			tab.inject(this.tabs[index-1], 'after');
			section.inject(this.tabs[index-1].retrieve('section'), 'after');
		}
		this.tabs.splice(index, 0, tab);
		clicker = clicker || tab;

		tab.addEvents({
			mouseout: function(){
				tab.removeClass(this.options.mouseoverClass);
			}.bind(this),
			mouseover: function(){
				tab.addClass(this.options.mouseoverClass);
			}.bind(this)
		});

		clicker.addEvent('click', function(e){
			e.preventDefault();
			this.show(index);
		}.bind(this));

		tab.store('tabbered', true);
		tab.store('section', section);
		tab.store('clicker', clicker);
		this.hideSection(index);
		return this;
	},
	removeTab: function(index){
		var now = this.tabs[this.now];
		if (this.now == index){
			if (index > 0) this.show(index - 1);
			else if (index < this.tabs.length) this.show(index + 1);
		}
		this.now = this.tabs.indexOf(now);
		return this;
	},
	moveTab: function(from, to){
		var tab = this.tabs[from];
		var clicker = tab.retrieve('clicker');
		var section = tab.retrieve('section');

		var toTab = this.tabs[to];
		var toClicker = toTab.retrieve('clicker');
		var toSection = toTab.retrieve('section');

		this.tabs.erase(tab).splice(to, 0, tab);

		tab.inject(toTab, 'before');
		clicker.inject(toClicker, 'before');
		section.inject(toSection, 'before');
		return this;
	},
	show: function(i){
		if (this.now == null) {
			this.tabs.each(function(tab, idx){
				if (i != idx)
					this.hideSection(idx);
			}, this);
		}
		this.showSection(i).save(i);
		return this;
	},
	save: function(index){
		if (this.options.cookieName)
			Cookie.write(this.options.cookieName, index, {duration:this.options.cookieDays});
		return this;
	},
	recall: function(){
		return (this.options.cookieName) ? Cookie.read(this.options.cookieName) : false;
	},
	hideSection: function(idx) {
		var tab = this.tabs[idx];
		if (!tab) return this;
		var sect = tab.retrieve('section');
		if (!sect) return this;
		if (sect.getStyle('display') != 'none') {
			this.lastHeight = sect.getSize().y;
			sect.setStyle('display', 'none');
			tab.swapClass(this.options.selectedClass, this.options.deselectedClass);
			this.fireEvent('onBackground', [idx, sect, tab]);
		}
		return this;
	},
	showSection: function(idx) {
		var tab = this.tabs[idx];
		if (!tab) return this;
		var sect = tab.retrieve('section');
		if (!sect) return this;
		var smoothOk = this.options.smooth && !Browser.ie;
		if (this.now != idx) {
			if (!tab.retrieve('tabFx'))
				tab.store('tabFx', new Fx.Morph(sect, this.options.effectOptions));
			var overflow = sect.getStyle('overflow');
			var start = {
				display:'block',
				overflow: 'hidden'
			};
			if (smoothOk) start.opacity = 0;
			var effect = false;
			if (smoothOk) {
				effect = {opacity: 1};
			} else if (sect.getStyle('opacity').toInt() < 1) {
				sect.setStyle('opacity', 1);
				if (!this.options.smoothSize) this.fireEvent('onActiveAfterFx', [idx, sect, tab]);
			}
			if (this.options.smoothSize) {
				var size = sect.getDimensions().height;
				if (this.options.maxSize != null && this.options.maxSize < size)
					size = this.options.maxSize;
				if (!effect) effect = {};
				effect.height = size;
			}
			if (this.now != null) this.hideSection(this.now);
			if (this.options.smoothSize && this.lastHeight) start.height = this.lastHeight;
			sect.setStyles(start);
			var finish = function(){
				this.fireEvent('onActiveAfterFx', [idx, sect, tab]);
				sect.setStyles({
					height: this.options.maxSize == effect.height ? this.options.maxSize : "auto",
					overflow: overflow
				});
				sect.getElements('input, textarea').setStyle('opacity', 1);
			}.bind(this);
			if (effect) {
				tab.retrieve('tabFx').start(effect).chain(finish);
			} else {
				finish();
			}
			this.now = idx;
			this.fireEvent('onActive', [idx, sect, tab]);
		}
		tab.swapClass(this.options.deselectedClass, this.options.selectedClass);
		return this;
	}
});


/*
---

script: String.QueryString.js

name: String.QueryString

description: Methods for dealing with URI query strings.

license: MIT-style license

authors:
  - Sebastian Markbåge
  - Aaron Newton
  - Lennart Pilon
  - Valerio Proietti

requires:
  - Core/Array
  - Core/String
  - /MooTools.More

provides: [String.QueryString]

...
*/

String.implement({

	parseQueryString: function(decodeKeys, decodeValues){
		if (decodeKeys == null) decodeKeys = true;
		if (decodeValues == null) decodeValues = true;

		var vars = this.split(/[&;]/),
			object = {};
		if (!vars.length) return object;

		vars.each(function(val){
			var index = val.indexOf('=') + 1,
				value = index ? val.substr(index) : '',
				keys = index ? val.substr(0, index - 1).match(/([^\]\[]+|(\B)(?=\]))/g) : [val],
				obj = object;
			if (!keys) return;
			if (decodeValues) value = decodeURIComponent(value);
			keys.each(function(key, i){
				if (decodeKeys) key = decodeURIComponent(key);
				var current = obj[key];

				if (i < keys.length - 1) obj = obj[key] = current || {};
				else if (typeOf(current) == 'array') current.push(value);
				else obj[key] = current != null ? [current, value] : value;
			});
		});

		return object;
	},

	cleanQueryString: function(method){
		return this.split('&').filter(function(val){
			var index = val.indexOf('='),
				key = index < 0 ? '' : val.substr(0, index),
				value = val.substr(index + 1);

			return method ? method.call(null, key, value) : (value || value === 0);
		}).join('&');
	}

});


/*
---
name: Behavior.Tabs
description: Adds a tab interface (TabSwapper instance) for elements with .css-tab_ui. Matched with tab elements that are .tabs and sections that are .tab_sections.
provides: [Behavior.Tabs]
requires: [Behavior/Behavior, /TabSwapper, More/String.QueryString]
script: Behavior.Tabs.js

...
*/

Behavior.addGlobalFilters({

	Tabs: {
		defaults: {
			'tabs-selector': '.tabs>li',
			'sections-selector': '.tab_sections>li',
			smooth: true,
			smoothSize: true,
			rearrangeDOM: false
		},
		setup: function(element, api) {
			var tabs = element.getElements(api.get('tabs-selector'));
			var sections = element.getElements(api.get('sections-selector'));
			if (tabs.length != sections.length || tabs.length == 0) {
				api.fail('warning; sections and sections are not of equal number. tabs: %o, sections: %o', tabs, sections);
			}
			var getHash = function(){
				return window.location.hash.substring(1, window.location.hash.length).parseQueryString();
			};

			var ts = new TabSwapper(
				Object.merge(
					{
						tabs: tabs,
						sections: sections,
						initPanel: api.get('hash') ? getHash()[api.get('hash')] : null
					},
					Object.cleanValues(
						api.getAs({
							smooth: Boolean,
							smoothSize: Boolean,
							rearrangeDOM: Boolean,
							selectedClass: String,
							initPanel: Number
						})
					)
				)
			);
			ts.addEvent('active', function(index){
				if (api.get('hash')) {
					var hash = getHash();
					hash[api.get('hash')] = index;
					window.location.hash = Object.cleanValues(Object.toQueryString(hash));
				}
				api.fireEvent('layout:display', sections[0].getParent());
			});
			element.store('TabSwapper', ts);
			return ts;
		}
	}
});


/*
---

script: epub.js

description: Main epub startup file.

requires:
 - Core/DomReady
 - More/Assets
 - Behavior/Behavior
 - Behavior/Delegator
 - Behavior/Element.Data
 - Behavior/BehaviorAPI
 - Behavior/Behavior
 - Behavior/Event.Mock
 - Behavior/Delegator
 - More/Mask
 - More-Behaviors/Delegator.AddRemoveClass
 - More-Behaviors/Behavior.FxAccordion
 - Clientcide/Behavior.Tabs

provides: [epub]

...
*/

window.addEvent('domready', function(){
	var behavior = new Behavior({
		selector: '[data-behavior]:not(.hidden .modal [data-behavior])'
	}).apply(document.body);
	var delegator = new Delegator({
		getBehavior: function(){ return behavior; }
	}).attach(document.body);
});

Mask.implement({
	options: {
		useIframeShim: false
	},
	render: function(){
		//copy of render method from Mask, but the tag here is an anchor
		this.element = new Element('a', {
			'class': this.options['class'],
			id: this.options.id || 'mask-' + String.uniqueID(),
			styles: Object.merge({}, this.options.style, {
				display: 'none'
			}),
			events: {
				click: function(event){
					this.fireEvent('click', event);
					if (this.options.hideOnClick) this.hide();
				}.bind(this)
			}
		});

		this.hidden = true;
	}
});

/*
---

script: Delegator.FakeLabel.js

description: iPad doesn't seem to support label interactions. Writing a delegator to simulate it on links.

requires:
  - Behavior/Delegator
  - Behavior/Event.Mock

provides: [Delegator.FakeLabel]

...
*/
Delegator.register('click', 'fakeLabel', {
	defaults: {
		target: 'input'
	},
	handler: function(event, element, api) {
		var input = element.getElement(api.get('target'));
		if (['checkbox', 'radio'].contains(input.get('type'))) {
			input.checked = true;
			input.fireEvent('change', new Event.Mock(input, 'change'));
		}
		input.focus();
	}
});

/*
---
description: Tabs extension w/ pagination
provides: [Delegator.TabsPagination]
requires: [Clientcide/Behavior.Tabs]
script: Delegator.TabsPagination.js
name: Delegator.TabsPagination

...
*/

/*
  IMPORTANT: If you are using this linker to reference a tabs instance in a popup
  you must remember that the tabs element is cloned into the popup, meaning that there are
  two in the document. The popup will always be the first one in the DOM. Write your tabs selector
  accordingly.

  Example usage:

  <div id="comic-popup" class="modal">
		<div data-behavior="Tabs" data-tabs-options="
				'tabs-selector': '.thumbs a',
				'sections-selector': '.slide',
				'smooth': false,
				'smoothSize': false
			" id="comic-tabs">
			<div class="modal-body">
				<div class="slides">
					<div class="page-left" data-trigger="PageTabs" data-pagetabs-options="
						'tabs': '!body #comic-tabs',
						'direction': 'back'
					"></div>
					<div class="page-right" data-trigger="PageTabs" data-pagetabs-options="
						'tabs': '!body #comic-tabs',
						'direction': 'next'
					"></div>
					<div class="slide">
						<img src="../Images/AMS-ePub-04-cell1.jpg" alt="" />
					</div>
					<div class="slide hidden">
						<img src="../Images/AMS-ePub-04-cell2.jpg" alt="" />
					</div>
					<div class="slide hidden">
						<img src="../Images/AMS-ePub-04-cell3.jpg" alt="" />
					</div>
					<div class="slide">
						<img src="../Images/AMS-ePub-04-cell4.jpg" alt="" />
					</div>
					<div class="slide hidden">
						<img src="../Images/AMS-ePub-04-cell5.jpg" alt="" />
					</div>
					<div class="slide hidden">
						<img src="../Images/AMS-ePub-04-cell6.jpg" alt="" />
					</div>
					<div class="slide">
						<img src="../Images/AMS-ePub-04-cell7.jpg" alt="" />
					</div>
					<div class="slide hidden">
						<img src="../Images/AMS-ePub-04-cell8.jpg" alt="" />
					</div>
				</div>
			</div>
			<div class="modal-footer">
				<div class="thumbs">
					<div class="scroller scrollable horizontal">
						<a><img src="../Images/AMS-ePub-04-cell1th.jpg" width="70" height="70" alt="Cell 1"/></a>
						<a><img src="../Images/AMS-ePub-04-cell2th.jpg" width="70" height="70" alt="Cell 2"/></a>
						<a><img src="../Images/AMS-ePub-04-cell3th.jpg" width="70" height="70" alt="Cell 3"/></a>
						<a><img src="../Images/AMS-ePub-04-cell4th.jpg" width="70" height="70" alt="Cell 4"/></a>
						<a><img src="../Images/AMS-ePub-04-cell5th.jpg" width="70" height="70" alt="Cell 5"/></a>
						<a><img src="../Images/AMS-ePub-04-cell6th.jpg" width="70" height="70" alt="Cell 6"/></a>
						<a><img src="../Images/AMS-ePub-04-cell7th.jpg" width="70" height="70" alt="Cell 7"/></a>
						<a><img src="../Images/AMS-ePub-04-cell8th.jpg" width="70" height="70" alt="Cell 8"/></a>
					</div>
				</div>
				<a class="close btn primary">Close</a>
			</div>
		</div>
	</div>

*/

Delegator.register('click', 'PageTabs', {
  requireAs: {
    tabs: String //selector to the tabs instance; see warning above.
  },
  handler: function(event, link, api){
    var target = link.getElement(api.get('tabs'));
    if (!target) api.fail('Could not find target for selector ' + api.get('tabs'));
    var tabs = target.getBehaviorResult('Tabs');
    if (!tabs) api.fail('The target element is not part of a tabs interface');

    var now = tabs.now;
    var next = api.get('direction') == 'back' ? next = now - 1 : next = now + 1;

    if (!tabs.tabs[next]) return;

    tabs.show(next);
  }
});

/*
---
description: Provides functionality to add a class to one element in a group when it is clicked.
provides: [Delegator.SelectOne]
requires: [Behavior/Delegator, Core/Element.Event]
script: Delegator.SelectOne.js
name: Delegator.SelectOne

...
*/
Delegator.register('click', 'selectOne', {
  require: ['targets'],
  defaults: {
    'class': 'selected'
  },
  handler: function(event, link, api){
    var targets = link.getElements(api.get('targets'));
    if (targets.length == 0) api.fail('Could not find targets for selector ' + api.get('targets'));

    targets.removeClass(api.get('class'));
    if (targets.contains(link)) {
      link.addClass(api.get('class'));
    } else {
      targets.some(function(el){
        if (el.contains(link)) {
          el.addClass(api.get('class'));
          return true; //exit out of loop
        }
      });
    }
  }
});

/*
---
description: Allows you to display a specific slide in a gallery
provides: [Delegator.ShowSlide]
requires: [Clientcide/Behavior.Tabs]
script: Delegator.ShowSlide.js
name: Delegator.ShowSlide

...
*/

/*
  IMPORTANT: If you are using this linker to reference a tabs instance in a popup
  you must remember that the tabs element is cloned into the popup, meaning that there are
  two in the document. The popup will always be the first one in the DOM. Write your tabs selector
  accordingly.
*/

Delegator.register('click', 'ShowSlide', {
  requireAs: {
    tabs: String, //selector to the tabs instance; see warning above.
    index: Number //index tab to show
  },
  handler: function(event, link, api){
    var target = link.getElement(api.get('tabs'));
    if (!target) api.fail('Could not find target for selector ' + api.get('tabs'));
    var tabs = target.getBehaviorResult('Tabs');
    if (!tabs) api.fail('The target element is not part of a tabs interface');
    tabs.show(api.getAs(Number, 'index'));
  }
});

/*
---

script: FlashCards.js

description: Provides delegators for popups and popovers

requires:
 - Behavior/Behavior

provides: [FlashCards]

...
*/
var FlashCards = new Class({
    Implements: [Options],
    options: {
        questionSet: null,
        slide: '.slide',
        definition: '.definition',
        term: '.term',
        actions: {
            show: '.show',
            next: '.next',
            prev: '.prev',
            swap: '.swap'
        }
    },
    swapped: false,
    actions: [],
    initialize: function (container, options) {
        this.toggle = 'show';
        this.element = document.id(container);
        this.setOptions(options);
        if(this.options.questionSet) {
            this.setupDOM();
        }
        Object.each(this.options.actions, function(v, k){
            this.actions[k] = this.element.getElement(v);
            this.actions[k].addEvent('click', this[k].bind(this));
        }, this);
        this.slides = this.element.getElements(this.options.slide);
    },
    current: 0,
    show: function () {
        var target = this.swapped ? this.options.term : this.options.definition,
            el = this.element.getElement('.' + this.toggle);

        this.slides[this.current].getElement(target)[this.toggle === 'show' ? 'removeClass' : 'addClass']('hiddenVisibility');
        el.removeClass(this.toggle);
        this.toggle = this.toggle === 'show' ? 'hide' : 'show';
        // Toggle the image.
        el.addClass(this.toggle);
    },
    next: function(){
        this.hideShown();
        this.slides[this.current].addClass('hiddenVisibility');
        this.current++;
        if (this.current == this.slides.length) this.current = 0;
        this.slides[this.current].removeClass('hiddenVisibility');
    },
    prev: function(){
        this.hideShown();
        this.slides[this.current].addClass('hiddenVisibility');
        this.current--;
        if (this.current < 0) this.current = this.slides.length - 1;
        this.slides[this.current].removeClass('hiddenVisibility');
    },
    hideShown: function () {
        if (this.toggle === 'hide') {
            this.show();
        }
    },
    swap: function(){
        this.slides.each(function(slide){
            var term = slide.getElement(this.options.term);
            var definition = slide.getElement(this.options.definition);
            if (this.swapped) {
                definition.addClass('hiddenVisibility');
                term.removeClass('hiddenVisibility');
                term.inject(definition, 'before');
            } else {
                term.addClass('hiddenVisibility');
                definition.removeClass('hiddenVisibility');
                definition.inject(term, 'before');
            }
        }.bind(this));
        this.swapped = !this.swapped;
        // Switch to hide mode if we are in show mode.
        this.hideShown();
    },
    swapOld: function(){
        var terms, defs;
        if (this.swapped) {
            terms = this.element.getElements(this.options.definition);
            defs = this.element.getElements(this.options.term);
        } else {
            terms = this.element.getElements(this.options.term);
            defs = this.element.getElements(this.options.definition);
        }
        terms.each(function(term, i){
            var def = defs[i];
            def.inject(term.addClass('hiddenVisibility'), 'before').removeClass('hiddenVisibility');
        });
        this.swapped = !this.swapped;
    },
    setupDOM: function(){
        var qSet = this.options.questionSet;
        var qWrapper = new Element('div', {'class': 'slides' });
        qSet.each(function(q){
            var qEl = new Element('div', { 'class': 'slide' });
            qEl.adopt(new Element('div', { 'class': 'term', text: q.term }));
            qEl.adopt(new Element('div', { 'class': 'definition', html: q.definition }));
            qWrapper.adopt(qEl);
        });

        var controlWrapper = new Element('div', {'class':'controls'});
        var addBtn = function(text, className, imgSrc) {
            controlWrapper.adopt(Elements.from('<a class="' + className + '"><img src="' + imgSrc + '" /></a>'));
        }

        // addBtn('Previous', 'prev', '../Images/Previous.png');
        // addBtn('Next', 'next', '../Images/Next.png');
        controlWrapper.adopt(Elements.from('<a class="prev"></a>'));
        controlWrapper.adopt(Elements.from('<a class="next"></a>'));
        controlWrapper.adopt(Elements.from('<a class="show"></a>'));
        controlWrapper.adopt(Elements.from('<a class="swap"></a>'));
        // addBtn('Swap', 'swap', '../Images/Swap.png');

        var widgetWrapper = new Element('div', { "class":"flashcard-wrapper", styles: { 'min-height': this.options.height + 'px' }});
        $(widgetWrapper).adopt(qWrapper);
        $(widgetWrapper).adopt(controlWrapper);

        $(this).empty();
        $(this).adopt(widgetWrapper);

        // Hide definitions and cards other than the first one.
        // We do this after a timeout to fix an iBooks bug: see CHAUC-1068.
        
        $(this).getElements('.slide:nth-of-type(1n + 2)').addClass('hiddenVisibility');
        $(this).getElements('.slide .definition').addClass('hiddenVisibility');
        
    },
    toElement: function(){
        return this.element;
    }
});

Behavior.addGlobalFilters({
    Cards: function(el, api){
        new FlashCards(el);
    }
});


/*
---

script: flashlog.js

description: Provides logging messages for iBooks

requires:
  - Core/DomReady
  - Core/Element.Event

provides: [flashlog]

...
*/

var flashlog = {};

window.addEvent('domready', function(){
	flashlog.logDiv = new Element('div', {
		id: 'log',
		styles: {
			backgroundColor: "#fff",
			border: "1px solid #000"
		},
		events: {
			click: function(){
				this.set('html', '');
			}
		}
	});
	if (Browser.Platform.ios) document.body.addClass('iOS');
});
var log = function(){
	new Element('div', {
		styles: {
			borderBottom: '3px solid #666'
		},
		html: Array.join(arguments, ' ')
	}).inject(flashlog.logDiv);
	flashlog.logDiv.inject(document.body);
};
flashlog.destroy = function() {
	if (flashlog.flashDiv){
		flashlog.flashDiv.destroy();
		delete flashlog.flashDiv;
	}
};
var flash = function(args, type){
	if (flashlog.flashDiv) flashlog.destroy();
	flashlog.flashDiv = new Element('div', {
		'class': 'alert-message flash'
	}).inject(document.body);
	flashlog.flashDiv.addClass(type);
	flashlog.flashDiv.show().innerHTML += '<p>' +  Array.join(args, ' ') + '</p>';
	clearTimeout(flashlog.flashTimer);
	flashlog.flashTimer = destroy.delay(3000);
};
['error', 'success', 'info', 'warning'].each(function(type){
	flash[type] = function(){
		flash(arguments, type);
	};
});


/*
---

script: Fx.Scroll.js

name: Fx.Scroll

description: Effect to smoothly scroll any element, including the window.

license: MIT-style license

authors:
  - Valerio Proietti

requires:
  - Core/Fx
  - Core/Element.Event
  - Core/Element.Dimensions
  - /MooTools.More

provides: [Fx.Scroll]

...
*/

(function(){

Fx.Scroll = new Class({

	Extends: Fx,

	options: {
		offset: {x: 0, y: 0},
		wheelStops: true
	},

	initialize: function(element, options){
		this.element = this.subject = document.id(element);
		this.parent(options);

		if (typeOf(this.element) != 'element') this.element = document.id(this.element.getDocument().body);

		if (this.options.wheelStops){
			var stopper = this.element,
				cancel = this.cancel.pass(false, this);
			this.addEvent('start', function(){
				stopper.addEvent('mousewheel', cancel);
			}, true);
			this.addEvent('complete', function(){
				stopper.removeEvent('mousewheel', cancel);
			}, true);
		}
	},

	set: function(){
		var now = Array.flatten(arguments);
		if (Browser.firefox) now = [Math.round(now[0]), Math.round(now[1])]; // not needed anymore in newer firefox versions
		this.element.scrollTo(now[0], now[1]);
		return this;
	},

	compute: function(from, to, delta){
		return [0, 1].map(function(i){
			return Fx.compute(from[i], to[i], delta);
		});
	},

	start: function(x, y){
		if (!this.check(x, y)) return this;
		var scroll = this.element.getScroll();
		return this.parent([scroll.x, scroll.y], [x, y]);
	},

	calculateScroll: function(x, y){
		var element = this.element,
			scrollSize = element.getScrollSize(),
			scroll = element.getScroll(),
			size = element.getSize(),
			offset = this.options.offset,
			values = {x: x, y: y};

		for (var z in values){
			if (!values[z] && values[z] !== 0) values[z] = scroll[z];
			if (typeOf(values[z]) != 'number') values[z] = scrollSize[z] - size[z];
			values[z] += offset[z];
		}

		return [values.x, values.y];
	},

	toTop: function(){
		return this.start.apply(this, this.calculateScroll(false, 0));
	},

	toLeft: function(){
		return this.start.apply(this, this.calculateScroll(0, false));
	},

	toRight: function(){
		return this.start.apply(this, this.calculateScroll('right', false));
	},

	toBottom: function(){
		return this.start.apply(this, this.calculateScroll(false, 'bottom'));
	},

	toElement: function(el, axes){
		axes = axes ? Array.from(axes) : ['x', 'y'];
		var scroll = isBody(this.element) ? {x: 0, y: 0} : this.element.getScroll();
		var position = Object.map(document.id(el).getPosition(this.element), function(value, axis){
			return axes.contains(axis) ? value + scroll[axis] : false;
		});
		return this.start.apply(this, this.calculateScroll(position.x, position.y));
	},

	toElementEdge: function(el, axes, offset){
		axes = axes ? Array.from(axes) : ['x', 'y'];
		el = document.id(el);
		var to = {},
			position = el.getPosition(this.element),
			size = el.getSize(),
			scroll = this.element.getScroll(),
			containerSize = this.element.getSize(),
			edge = {
				x: position.x + size.x,
				y: position.y + size.y
			};

		['x', 'y'].each(function(axis){
			if (axes.contains(axis)){
				if (edge[axis] > scroll[axis] + containerSize[axis]) to[axis] = edge[axis] - containerSize[axis];
				if (position[axis] < scroll[axis]) to[axis] = position[axis];
			}
			if (to[axis] == null) to[axis] = scroll[axis];
			if (offset && offset[axis]) to[axis] = to[axis] + offset[axis];
		}, this);

		if (to.x != scroll.x || to.y != scroll.y) this.start(to.x, to.y);
		return this;
	},

	toElementCenter: function(el, axes, offset){
		axes = axes ? Array.from(axes) : ['x', 'y'];
		el = document.id(el);
		var to = {},
			position = el.getPosition(this.element),
			size = el.getSize(),
			scroll = this.element.getScroll(),
			containerSize = this.element.getSize();

		['x', 'y'].each(function(axis){
			if (axes.contains(axis)){
				to[axis] = position[axis] - (containerSize[axis] - size[axis]) / 2;
			}
			if (to[axis] == null) to[axis] = scroll[axis];
			if (offset && offset[axis]) to[axis] = to[axis] + offset[axis];
		}, this);

		if (to.x != scroll.x || to.y != scroll.y) this.start(to.x, to.y);
		return this;
	}

});

//<1.2compat>
Fx.Scroll.implement({
	scrollToCenter: function(){
		return this.toElementCenter.apply(this, arguments);
	},
	scrollIntoView: function(){
		return this.toElementEdge.apply(this, arguments);
	}
});
//</1.2compat>

function isBody(element){
	return (/^(?:body|html)$/i).test(element.tagName);
}

})();


/*
---

script: scrollability.js

description: Single finger scrolling for ios.

provides: [Scrollability]

...
*/

/* See LICENSE for terms of usage */
(function() {

// Number of pixels finger must move to determine horizontal or vertical motion
var kLockThreshold = 10;

// Factor which reduces the length of motion by each move of the finger
var kTouchMultiplier = 1;

// Maximum velocity for motion after user releases finger
var kMaxVelocity = 720 / (window.devicePixelRatio||1);

// Rate of deceleration after user releases finger
var kDecelRate = 350;

// Percentage of the page which content can be overscrolled before it must bounce back
var kBounceLimit = 0.5;

// Rate of deceleration when content has overscrolled and is slowing down before bouncing back
var kBounceDecelRate = 600;

// Duration of animation when bouncing back
var kBounceTime = 80;
var kPageBounceTime = 60;

// Percentage of viewport which must be scrolled past in order to snap to the next page
var kPageLimit = 0.5;

// Velocity at which the animation will advance to the next page
var kPageEscapeVelocity = 50;

// Vertical margin of scrollbar
var kScrollbarMargin = 1;

// Time to scroll to top
var kScrollToTopTime = 200;

var isWebkit = "webkitTransform" in document.documentElement.style;
var isFirefox = "MozTransform" in document.documentElement.style;
var isTouch = "ontouchstart" in window;

// ===============================================================================================

var startX, startY, touchX, touchY, touchDown, touchMoved, justChangedOrientation;
var animationInterval = 0;
var touchTargets = [];

var scrollers = {
    'horizontal': createXTarget,
    'vertical': createYTarget
};

var scrollability = {
    globalScrolling: false,
    scrollers: scrollers,

    flashIndicators: function() {
        var scrollables = document.querySelectorAll('.scrollable.vertical');
        for (var i = 0; i < scrollables.length; ++i) {
            scrollability.scrollTo(scrollables[i], 0, 0, 20, true);
        }
    },

    scrollToTop: function() {
        var scrollables = document.getElementsByClassName('scrollable');
        if (scrollables.length) {
            var scrollable = scrollables[0];
            if (scrollable.className.indexOf('vertical') != -1) {
                scrollability.scrollTo(scrollable, 0, 0, kScrollToTopTime);
            }
        }

    },

    scrollTo: function(element, x, y, animationTime, muteDelegate) {
        stopAnimation();

        var target = createTargetForElement(element);
        if (target) {
            if (muteDelegate) {
                target.delegate = null;
            }
            target = wrapTarget(target);
            touchTargets = [target];
            touchMoved = true;
            if (animationTime) {
                var orig = element[target.key];
                var dest = target.filter(x, y);
                var dir = dest - orig;
                var startTime = new Date().getTime();
                animationInterval = setInterval(function() {
                    var d = new Date().getTime() - startTime;
                    var pos = orig + ((dest-orig) * (d/animationTime));
                    if ((dir < 0 && pos < dest) || (dir > 0 && pos > dest)) {
                        pos = dest;
                    }
                    target.updater(pos);
                    if (pos == dest) {
                        clearInterval(animationInterval);
                        setTimeout(stopAnimation, 200);
                    }
                }, 20);
            } else {
                target.updater(y);
                stopAnimation();
            }
        }
    }
};


function init() {
    window.scrollability = scrollability;
    document.addEventListener('touchstart', onTouchStart, false);
    document.addEventListener('scroll', onScroll, false);
    document.addEventListener('orientationchange', onOrientationChange, false);
    // see onLoad() below for why this is commented
    // window.addEventListener('load', onLoad, false);
}

function onLoad() {
    //latest iOS release no longer requires two fingers for scrolling oveflown elements
    //this library is still used in the sidebar functionality
    //scrollability.flashIndicators();
}

function onScroll(event) {
    setTimeout(function() {
        if (justChangedOrientation) {
            justChangedOrientation = false;
        } else if (isTouch) {
            scrollability.scrollToTop();
        }
    });
}

function onOrientationChange(event) {
    justChangedOrientation = true;
}

function onTouchStart(event) {
    stopAnimation();

    var touchCandidate = event.target;
    var touch = event.touches[0];
    var touched = null;
    var startTime = new Date().getTime();

    touchX = startX = touch.clientX;
    touchY = startY = touch.clientY;
    touchDown = true;
    touchMoved = false;

    touchTargets = getTouchTargets(event.target, touchX, touchY, startTime);
    if (!touchTargets.length && !scrollability.globalScrolling) {
        return true;
    }

    var holdTimeout = setTimeout(function() {
        holdTimeout = 0;
        touched = setTouched(touchCandidate);
    }, 50);

    var d = document;
    d.addEventListener('touchmove', onTouchMove, false);
    d.addEventListener('touchend', onTouchEnd, false);

    animationInterval = setInterval(touchAnimation, 0);

    function onTouchMove(event) {
        event.preventDefault();
        touchMoved = true;

        if (holdTimeout) {
            clearTimeout(holdTimeout);
            holdTimeout = 0;
        }
        if (touched) {
            releaseTouched(touched);
            touched = null;
        }
        var touch = event.touches[0];
        touchX = touch.clientX;
        touchY = touch.clientY;

        // Reduce the candidates down to the one whose axis follows the finger most closely
        if (touchTargets.length > 1) {
            for (var i = 0; i < touchTargets.length; ++i) {
                var target = touchTargets[i];
                if (target.disable && target.disable(touchX, touchY, startX, startY)) {
                    target.terminator();
                    touchTargets.splice(i, 1);
                    break;
                }
            }
        }
    }

    function onTouchEnd(event) {
        if (holdTimeout) {
            clearTimeout(holdTimeout);
            holdTimeout = 0;
        }

        // Simulate a click event when releasing the finger
        if (touched) {
            var evt = document.createEvent('MouseEvents');
            evt.initMouseEvent('click', true, true, window, 1);
            touched[0].dispatchEvent(evt);
            releaseTouched(touched);
        }

        d.removeEventListener('touchmove', onTouchMove, false);
        d.removeEventListener('touchend', onTouchEnd, false);
        touchDown = false;
    }
}

function wrapTarget(target, startX, startY, startTime) {
    var delegate = target.delegate;
    var constrained = target.constrained;
    var paginated = target.paginated;
    var viewport = target.viewport || 0;
    var scrollbar = target.scrollbar;
    var position = target.node[target.key];
    var min = target.min;
    var max = target.max;
    var absMin = min;
    var absMax = Math.round(max/viewport)*viewport;
    var pageSpacing = 0;
    var velocity = 0;
    var decelerating = 0;
    var decelOrigin, decelDelta;
    var bounceTime = paginated ? kPageBounceTime : kBounceTime;
    var bounceLimit = target.bounce;
    var pageLimit = viewport * kPageLimit;
    var lastTouch = startTouch = target.filter(startX, startY);
    var lastTime = startTime;
    var stillTime = 0;
    var stillThreshold = 20;
    var snapped = false;
    var locked = false;

    if (paginated) {
        var excess = Math.round(Math.abs(absMin) % viewport);
        var pageCount = ((Math.abs(absMin)-excess) / viewport)+1;
        var pageSpacing = excess / pageCount;

        var positionSpacing = Math.round(position) % viewport;
        var pagePosition = Math.round((position-positionSpacing)/viewport) * viewport;
        min = max = Math.round(pagePosition + absMax)+positionSpacing;
        absMin += pageSpacing;
    }

    if (delegate && delegate.onStartScroll) {
        if (!delegate.onStartScroll()) {
            return null;
        }
    }

    if (scrollbar) {
        target.node.parentNode.appendChild(scrollbar);
    }

    function animator(touch, time) {
        var deltaTime = 1 / (time - lastTime);
        lastTime = time;

        var continues = true;
        if (touchDown) {
            var delta = (touch - lastTouch) * kTouchMultiplier;
            if (!delta) {
                // Heuristics to prevent out delta=0 changes from making velocity=0 and
                // stopping all motion in its tracks.  We need to distinguish when the finger
                // has actually stopped moving from when the timer fired too quickly.
                if (!stillTime) {
                    stillTime = time;
                }
                if (time - stillTime < stillThreshold) {
                    return true;
                }
            } else {
                stillTime = 0;
            }

            if (!locked && Math.abs(touch - startTouch) > kLockThreshold) {
                locked = true;
                if (delegate && delegate.onLockScroll) {
                    delegate.onLockScroll(target.key);
                }
            }

            lastTouch = touch;
            velocity = delta / deltaTime;

            // Apply resistance along the edges
            if (position > max && absMax == max && constrained) {
                var excess = position - max;
                velocity *= (1.0 - excess / bounceLimit);
            } else if (position < min && absMin == min && constrained) {
                var excess = min - position;
                velocity *= (1.0 - excess / bounceLimit);
            }
        } else {
            if (paginated && !snapped) {
                // When finger is released, decide whether to jump to next/previous page
                // or to snap back to the current page
                snapped = true;
                if (Math.abs(position - max) > pageLimit || Math.abs(velocity) > kPageEscapeVelocity) {
                    if (position > max) {
                        if (max != absMax) {
                            max += viewport+pageSpacing;
                            min += viewport+pageSpacing;
                            if (delegate && delegate.onScrollPage) {
                                var totalSpacing = min % viewport;
                                var page = -Math.round((position+viewport-totalSpacing)/viewport);
                                delegate.onScrollPage(page, -1);
                            }
                        }
                    } else {
                        if (min != absMin) {
                            max -= viewport+pageSpacing;
                            min -= viewport+pageSpacing;
                            if (delegate && delegate.onScrollPage) {
                                var totalSpacing = min % viewport;
                                var page = -Math.round((position-viewport-totalSpacing)/viewport);
                                delegate.onScrollPage(page, 1);
                            }
                        }
                    }
                }
            }

            if (position > max && constrained) {
                if (velocity > 0) {
                    // Slowing down
                    var excess = position - max;
                    var elasticity = (1.0 - excess / bounceLimit);
                    velocity = Math.max(velocity - kBounceDecelRate * deltaTime, 0) * elasticity;
                    decelerating = 0;
                } else {
                    // Bouncing back
                    if (!decelerating) {
                        decelOrigin = position;
                        decelDelta = max - position;
                    }

                    position = easeOutExpo(decelerating, decelOrigin, decelDelta, bounceTime);
                    return update(position, ++decelerating <= bounceTime && Math.floor(position) > max);
                }
            } else if (position < min && constrained) {
                if (velocity < 0) {
                    // Slowing down
                    var excess = min - position;
                    var elasticity = (1.0 - excess / bounceLimit);
                    velocity = Math.min(velocity + kBounceDecelRate * deltaTime, 0) * elasticity;
                    decelerating = 0;
                } else {
                    // Bouncing back
                    if (!decelerating) {
                        decelOrigin = position;
                        decelDelta = min - position;
                    }
                    position = easeOutExpo(decelerating, decelOrigin, decelDelta, bounceTime);
                    return update(position, ++decelerating <= bounceTime && Math.ceil(position) < min);
                }
            } else {
                // Slowing down
                if (!decelerating) {
                    if (velocity < 0 && velocity < -kMaxVelocity) {
                        velocity = -kMaxVelocity;
                    } else if (velocity > 0 && velocity > kMaxVelocity) {
                        velocity = kMaxVelocity;
                    }
                    decelOrigin = velocity;
                }

                velocity = easeOutExpo(decelerating, decelOrigin, -decelOrigin, kDecelRate);

                if (++decelerating > kDecelRate || Math.floor(velocity) == 0) {
                    continues = false;
                }
            }
        }

        position += velocity * deltaTime;
        return update(position, continues);
    }

    function update(pos, continues) {
        position = pos;

        target.node[target.key] = position;
        target.update(target.node, position);

        if (delegate && delegate.onScroll) {
            delegate.onScroll(position);
        }

        // Update the scrollbar
        var range = -min - max;
        if (scrollbar && viewport < range) {
            var viewable = viewport - kScrollbarMargin*2;
            var height = (viewable/range) * viewable;
            var scrollPosition = 0;
            if (position > max) {
                height = Math.max(height - (position-max), 7);
                scrollPosition = 0;
            } else if (position < min) {
                height = Math.max(height - (min - position), 7);
                scrollPosition = (viewable-height);
            } else {
                scrollPosition = Math.round((Math.abs(position) / range) * (viewable-height));
            }
            scrollPosition += kScrollbarMargin;
            scrollbar.style.height = Math.round(height) + 'px';

            moveElement(scrollbar, 0, Math.round(scrollPosition));

            if (touchMoved) {
                scrollbar.style.webkitTransition = 'none';
                scrollbar.style.opacity = '1';
            }
        }

        return continues;
    }

    function terminator() {
        // Snap to the integer endpoint, since position may be a subpixel value while animating
        if (paginated) {
            var pageIndex = Math.round(position/viewport);
            update(pageIndex * (viewport+pageSpacing));
        } else  if (position > max && constrained) {
            update(max);
        } else if (position < min && constrained) {
            update(min);
        }

        // Hide the scrollbar
        if (scrollbar) {
            scrollbar.style.opacity = '0';
            scrollbar.style.webkitTransition = 'opacity 0.33s linear';
        }
        if (delegate && delegate.onEndScroll) {
            delegate.onEndScroll();
        }
    }

    target.updater = update;
    target.animator = animator;
    target.terminator = terminator;
    return target;
}

function touchAnimation() {
    var time = new Date().getTime();

    // Animate each of the targets
    for (var i = 0; i < touchTargets.length; ++i) {
        var target = touchTargets[i];

        // Translate the x/y touch into the value needed by each of the targets
        var touch = target.filter(touchX, touchY);
        if (!target.animator(touch, time)) {
            target.terminator();
            touchTargets.splice(i--, 1);
        }
    }

    if (!touchTargets.length) {
        stopAnimation();
    }
}

// *************************************************************************************************

function getTouchTargets(node, touchX, touchY, startTime) {
    var targets = [];
    findTargets(node, targets, touchX, touchY, startTime);

    var candidates = document.querySelectorAll('.scrollable.global');
    for (var j = 0; j < candidates.length; ++j) {
        findTargets(candidates[j], targets, touchX, touchY, startTime);
    }
    return targets;
}

function findTargets(element, targets, touchX, touchY, startTime) {
    while (element) {
        if (element.nodeType == 1) {
            var target = createTargetForElement(element, touchX, touchY, startTime);
            if (target) {
                // Look out for duplicates
                var exists = false;
                for (var j = 0; j < targets.length; ++j) {
                    if (targets[j].node == element) {
                        exists = true;
                        break;
                    }
                }
                if (!exists) {
                    target = wrapTarget(target, touchX, touchY, startTime);
                    if (target) {
                        targets.push(target);
                    }
                }
            }
        }
       element = element.parentNode;
    }
}

function createTargetForElement(element, touchX, touchY, startTime) {
    var classes = element.className.split(' ');
	//ADDED BY: Nachiket. Now scrollablity will be added to the class with "scrollable" class and 'horizontal' or 'vertical' class.
	if(!element.hasClass('scrollable')) {
		return;
	}
    for (var i = 0; i < classes.length; ++i) {
        var name = classes[i];
        if (scrollers[name]) {
            var target = scrollers[name](element);
            target.key = 'scrollable_'+name;
            target.paginated = classes.indexOf('paginated') != -1;
            if (!(target.key in element)) {
                element[target.key] = target.initial ? target.initial(element) : 0;
            }
            return target;
        }
    }
}

function setTouched(target) {
    var touched = [];
    for (var n = target; n; n = n.parentNode) {
        if (n.nodeType == 1) {
            n.className = (n.className ? n.className + ' ' : '') + 'touched';
            touched.push(n);
        }
    }
    return touched;
}

function releaseTouched(touched) {
    for (var i = 0; i < touched.length; ++i) {
        var n = touched[i];
        n.className = n.className.replace('touched', '');
    }
}

function stopAnimation() {
    if (animationInterval) {
        clearInterval(animationInterval);
        animationInterval = 0;

        for (var i = 0; i < touchTargets.length; ++i) {
            var target = touchTargets[i];
            target.terminator();
        }
        touchTargets = [];
    }
}

function moveElement(element, x, y) {
    if (isWebkit) {
        element.style.webkitTransform = 'translate3d('
        +(x ? (x+'px') : '0')+','
        +(y ? (y+'px') : '0')+','
        +'0)';
    } else if (isFirefox) {
        element.style.MozTransform = 'translate('
        +(x ? (x+'px') : '0')+','
        +(y ? (y+'px') : '0')+')';
    }
}
scrollability.moveElement = moveElement;

function initScrollbar(element) {
    if (!element.scrollableScrollbar) {
        var scrollbar = element.scrollableScrollbar = document.createElement('div');
        scrollbar.className = 'scrollableScrollbar';

        // We hardcode this CSS here to avoid having to provide a CSS file
        scrollbar.style.cssText = [
            'position: absolute',
            'top: 0',
            'right: 1px',
            'width: 7px',
            'min-height: 7px',
            'opacity: 0',
            '-webkit-transform: translate3d(0,0,0)',
            '-webkit-box-sizing: border-box',
            '-webkit-border-image: url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA4AAAAOCAYAAAAfSC3RAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAUhJREFUeNp0Ur1OwzAQtt1CaZQQgUjDhuicrEwoqjJlzpBAXoIHywtkcwfECyQPwIgKQkoyFJWq5k6cJcsUS5/sO993/1wpxazjAU4BJyR/A3aA0TSaGu85kbSO0y0AM/pH8lYr8ZwBLpBUluVtGIaPjuM8IYIgeEAdObwkB4xTqgv8iOP4vuu6lZEFRkUDHkWRbNv2mVJ/x4g+1pPn+RJICRlzk4Q3/lVVdUP1nwtqgpJSYqQJGbMj96RpmhXJM01kwzBcWU2x36zv+wXppro5TAihvat/HCjxa6R0V7FY5rruhx3BTtfzvDeS95rI0zSVcB+MpijL0SHLsjW9d3ocIRZvjINbKSsYx5rGsQdsNHFOC8CKolhCh+/GcbxG2ff9TZIkL3Vdv5KjT8AXN3b12MqZi4yRBiTZu7olmEvOacH/LPmPAAMA2bZzzeYUC40AAAAASUVORK5CYII=") 6 2 6 2 / 3px 1px 3px 1px round round',
            'z-index: 2147483647',
        ].join(';');
    }
    return element.scrollableScrollbar;
}

function easeOutExpo(t, b, c, d) {
    return (t==d) ? b+c : c * (-Math.pow(2, -10 * t/d) + 1) + b;
}

// *************************************************************************************************

function createXTarget(element) {
    var parent = element.parentNode;
    return {
        node: element,
        min: -parent.scrollWidth + parent.offsetWidth,
        max: 0,
        viewport: parent.offsetWidth,
        bounce: parent.offsetWidth * kBounceLimit,
        constrained: true,
        delegate: element.scrollDelegate,

        filter: function(x, y) {
            return x;
        },

        disable: function (x, y, startX, startY) {
            var dx = Math.abs(x - startX);
            var dy = Math.abs(y - startY);
            if (dy > dx && dy > kLockThreshold) {
                return true;
            }
        },

        update: function(element, position) {
            moveElement(element, position, element.scrollable_vertical||0);
        }
    };
}

function createYTarget(element) {
    var parent = element.parentNode;
    return {
        node: element,
        scrollbar: initScrollbar(element),
        min: -parent.scrollHeight + parent.offsetHeight,
        max: 0,
        viewport: parent.offsetHeight,
        bounce: parent.offsetHeight * kBounceLimit,
        constrained: true,
        delegate: element.scrollDelegate,

        filter: function(x, y) {
            return y;
        },

        disable: function(x, y, startX, startY) {
            var dx = Math.abs(x - startX);
            var dy = Math.abs(y - startY);
            if (dx > dy && dx > kLockThreshold) {
                return true;
            }
        },

        update: function(element, position) {
            moveElement(element, element.scrollable_horizontal||0, position);
        }
    };
}

init();

})();

/*
---

script: Fx.Scrollability.js

description: Provides logging messages for iBooks

requires:
  - More/Fx.Scroll
  - Scrollability

provides: [Fx.Scrollability]

...
*/

if (Browser.Platform.ios) {
	Fx.Scrollability = new Class({

		Extends: Fx.Scroll,

		current: [0, 0],

		start: function(x, y){
			if (!this.check(x, y)) return this;
			return this.constructor.prototype.start.apply(this, [this.current, [-x, -y]]);
		},

		set: function(){
			var now = Array.flatten(arguments);
			scrollability.scrollTo(this.element, now[0], now[1]);
			this.current = now;
			return this;
		},

		compute: function(){
			return this.parent.apply(this, arguments);
		}

	});
} else {
	Fx.Scrollability = Fx.Scroll
}

/*
---

script: Elements.From.js

name: Elements.From

description: Returns a collection of elements from a string of html.

license: MIT-style license

authors:
  - Aaron Newton

requires:
  - Core/String
  - Core/Element
  - /MooTools.More

provides: [Elements.from, Elements.From]

...
*/

Elements.from = function(text, excludeScripts){
	if (excludeScripts || excludeScripts == null) text = text.stripScripts();

	var container, match = text.match(/^\s*<(t[dhr]|tbody|tfoot|thead)/i);

	if (match){
		container = new Element('table');
		var tag = match[1].toLowerCase();
		if (['td', 'th', 'tr'].contains(tag)){
			container = new Element('tbody').inject(container);
			if (tag != 'tr') container = new Element('tr').inject(container);
		}
	}

	return (container || new Element('div')).set('html', text).getChildren();
};


/*
---

script: Popup.js

description: Provides delegators for popups and popovers

requires:
 - Behavior/Delegator
 - More/Mask
 - More/Elements.From
 - More/Element.Position
 - More/Element.Delegation
 - More/Element.Shortcuts

provides: [ShowPopup, Popover]

...
*/
(function(){

	var displayed;
	var show = function(el, pos, options, originalEl){
		options = options || {};
		if (options.mask == null) options.mask = true;
		var modal;
		if (options.mask) {
			modal = new Mask(document.body, {
				destroyOnHide: true
			}).show();
			modal.addEvent('hide', function(){
				el.destroy();
				displayed = false;
				if(originalEl) { originalEl.fireEvent('popupHidden'); };
			});
			modal.addEvent('click', function(){
				modal.hide();
			});
			el.addEvent('click:relay(.close)', function(){
				modal.hide();
			});
		} else {
			el.addEvent('click:relay(.close)', function(){
				el.destroy();
				displayed = false;
			});
		}
		displayed = true;
		el.inject(document.body, 'top').show();
		var ret = el.position(pos || {});
		
		//If reflowable book, then use fixedPos, and keep position of popup fixed.
		if(options.fixedPos) {
			setTimeout(function(){
				var top= '100px';
				var left= '100px';
				var elSize = el.getSize()
				if(options.pageHeight) {
					top = ((options.pageHeight/2) - (elSize.y/2)) + 'px';
				}
				if(options.pageWidth) {
					left = ((options.pageWidth/2) - (elSize.x/2)) + 'px';
				}
				el.setStyles({
					'position': 'fixed',
					'top': top,//(el.getPosition().y - window.scrollY) + "px",
					'left': left
				});
			},1);
		}
		return ret;
	};

	Delegator.register('click', 'ShowPopup', {

		require: ['target'],
		defaults: {
			mask: true
		},
		handler: function(event, link, api){
			if (displayed) return;
			var target = link.getElement(api.get('target'));
			event.preventDefault();
			if (!target) api.fail('Could not find target popup element: ', api.get('target'));
			targetAPI = new BehaviorAPI(target, 'data-modal');
			var t = target.clone(true, true);
			api.getBehavior().apply(t);
			var options = {
				mask: api.getAs(Boolean, 'mask'), 
				fixedPos: api.getAs(Boolean, 'fixedPos'),
				pageWidth: api.getAs(Number, 'pageWidth'),
				pageHeight: api.getAs(Number, 'pageHeight')
			} //mask, fixedPos,
			show(t, true, options, target);
			target.fireEvent('popupVisible',{original:target,clone:t});
		}

	});

	Delegator.register('click', 'Popover', {
		defaults: {
			template: '<div class="popover {position}"><div class="arrow"></div><div class="inner"><h3 class="title">{title}</h3><div class="content"><p>{alt}</p> <a class="btn close primary right">Close</a></div></div></div>',
			mask: true,
			position: 'auto'
		},
		handler: function(event, link, api){
			if (displayed) return;
			event.preventDefault();
			var template,
					templateElement = api.get('templateElement');
			if (templateElement) template = element.getElement(templateElement).get('html');
			if (!template) template = api.get('template');

			var pos = api.get('position');
			if (pos == 'auto'){
					if (link.getParent('.column1')) {
							pos = 'right';
					} else {
							pos = 'left'
					}
			};

			var position, edge;
			switch(pos){
				case 'above':
					position = 'centerTop';
					edge = 'centerBottom'
					break;
				case 'below':
					position = 'centerBottom';
					edge = 'centerTop'
					break;
				case 'left':
					position = 'centerLeft';
					edge = 'centerRight'
					break;
				case 'right':
					position = 'centerRight';
					edge = 'centerLeft'
					break;
			}

			var content = Elements.from(template.substitute({
				title: link.get('title'),
				alt: link.get('alt'),
				position: pos
			}))[0];

			var options = {
				mask: api.getAs(Boolean, 'mask'), 
				fixedPos: api.getAs(Boolean, 'fixedPos'),
				pageWidth: api.getAs(Number, 'pageWidth'),
				pageHeight: api.getAs(Number, 'pageHeight')
			}
			var coords = show(content, {
				relativeTo: link,
				position: position,
				edge: edge,
				returnPos: true
			}, options);
			if (pos == 'right') {
				delete coords.left;
				coords.right = 75;
			} else {
				coords.left = 75;
			}
			content.setStyles(coords);
		}
	});

})();

/*
---

script: Quiz.js

description: Provides the quizes for the epub.

requires:
 - More/String.QueryString
 - Core/Element.Event
 - Behavior/BehaviorAPI

provides: [flashlog]

...
*/

var Quiz = {
	showMessage: function(isSuccess, el){
		var quizEl = el.getParent(".quiz-list");
		var msg = isSuccess?'Correct! You answered correctly. Good job.':'Sorry! That is not the correct answer.';
		if(quizEl) {
			var quizElParent = quizEl.getParent();
			//REmove if already has
			if(quizElParent.getElements('.inline-message')) {
				quizElParent.getElements('.inline-message').destroy();
			}
			var cls = isSuccess?'quiz-correct':'quiz-incorrect';
			var msgEl = new Element("span", {'class':"inline-message epub__inline-message " + cls + " epub__"+cls});
			msgEl.set('text', msg);
			quizElParent.adopt(msgEl);
			setTimeout(function(){msgEl.destroy()}, 3000);
		} else {
			if(isSuccess) {
				flash.success(msg, 10);
			} else {
				flash.error(msg, 10);
			}
		}
	},
	Full: new Class({
		Implements: [Options, Events],
		options: {
/*

			onIncomplete: function(count){
				flash.warning('Remaining questions: ' + count);
			},
			onValidate: function(count){
				if (count) flash.error('You have ' + count + ' incorrect answer' + (count > 1 ? 's' : '') + '.');
				else flash.success('Nice work! You got all questions correct!');
			},

*/
			onCorrect: function(el){
				Quiz.showMessage(true, el);
			},
			onIncorrect: function(el){
				Quiz.showMessage(false, el);	
			}
		},
		initialize: function(el, options){
			this.setOptions(options);
			this.element = document.id(el);
			this.startup();
			this.attach();
		},
		startup: function(){
			this.element.getElements('[data-trigger*=selectOne]').each(function(el){
				var input = el.getElement('input');
				var api = new BehaviorAPI(el, 'selectone');
				if (input.checked) {
					el.getElements(api.get('targets')).each(function(target){
						if (target.contains(el)) target.addClass(api.get('class'));
					});
				}
			});
		},
		attach: function(){
			this.element.getElements('input, select').addEvent('change', this.validate.bind(this));
		},
		validate: function(e){
			var target = e.target;
			if (e.target.get('tag') == 'select') target = e.target.getSelected()[0];

			if (target.get('value') == 'correct') this.fireEvent('correct', target);
			else this.fireEvent('incorrect', target);

			var values = this.element.toQueryString().parseQueryString(),
			    incomplete = 0,
			    incorrect = 0;
			Object.each(values, function(v, k){
				if (!v) incomplete++;
				if (v != 'correct') incorrect++;
			});
			if (incomplete) {
				this.fireEvent('incomplete', [incomplete, values]);
			} else {
				this.fireEvent('validate', [incorrect, values]);
				if (!incorrect) this.fireEvent('success');
			}
		}
	})
};

Behavior.addGlobalFilter('Quiz', {
	setup: function(element, api){
		return new Quiz.Full(element);
	}
});

/*
---

name: Fx.Transitions

description: Contains a set of advanced transitions to be used with any of the Fx Classes.

license: MIT-style license.

credits:
  - Easing Equations by Robert Penner, <http://www.robertpenner.com/easing/>, modified and optimized to be used with MooTools.

requires: Fx

provides: Fx.Transitions

...
*/

Fx.implement({

	getTransition: function(){
		var trans = this.options.transition || Fx.Transitions.Sine.easeInOut;
		if (typeof trans == 'string'){
			var data = trans.split(':');
			trans = Fx.Transitions;
			trans = trans[data[0]] || trans[data[0].capitalize()];
			if (data[1]) trans = trans['ease' + data[1].capitalize() + (data[2] ? data[2].capitalize() : '')];
		}
		return trans;
	}

});

Fx.Transition = function(transition, params){
	params = Array.from(params);
	var easeIn = function(pos){
		return transition(pos, params);
	};
	return Object.append(easeIn, {
		easeIn: easeIn,
		easeOut: function(pos){
			return 1 - transition(1 - pos, params);
		},
		easeInOut: function(pos){
			return (pos <= 0.5 ? transition(2 * pos, params) : (2 - transition(2 * (1 - pos), params))) / 2;
		}
	});
};

Fx.Transitions = {

	linear: function(zero){
		return zero;
	}

};

//<1.2compat>

Fx.Transitions = new Hash(Fx.Transitions);

//</1.2compat>

Fx.Transitions.extend = function(transitions){
	for (var transition in transitions) Fx.Transitions[transition] = new Fx.Transition(transitions[transition]);
};

Fx.Transitions.extend({

	Pow: function(p, x){
		return Math.pow(p, x && x[0] || 6);
	},

	Expo: function(p){
		return Math.pow(2, 8 * (p - 1));
	},

	Circ: function(p){
		return 1 - Math.sin(Math.acos(p));
	},

	Sine: function(p){
		return 1 - Math.cos(p * Math.PI / 2);
	},

	Back: function(p, x){
		x = x && x[0] || 1.618;
		return Math.pow(p, 2) * ((x + 1) * p - x);
	},

	Bounce: function(p){
		var value;
		for (var a = 0, b = 1; 1; a += b, b /= 2){
			if (p >= (7 - 4 * a) / 11){
				value = b * b - Math.pow((11 - 6 * a - 11 * p) / 4, 2);
				break;
			}
		}
		return value;
	},

	Elastic: function(p, x){
		return Math.pow(2, 10 * --p) * Math.cos(20 * p * Math.PI * (x && x[0] || 1) / 3);
	}

});

['Quad', 'Cubic', 'Quart', 'Quint'].each(function(transition, i){
	Fx.Transitions[transition] = new Fx.Transition(function(p){
		return Math.pow(p, i + 2);
	});
});


/*
---

script: URI.js

name: URI

description: Provides methods useful in managing the window location and uris.

license: MIT-style license

authors:
  - Sebastian Markbåge
  - Aaron Newton

requires:
  - Core/Object
  - Core/Class
  - Core/Class.Extras
  - Core/Element
  - /String.QueryString

provides: [URI]

...
*/

(function(){

var toString = function(){
	return this.get('value');
};

var URI = this.URI = new Class({

	Implements: Options,

	options: {
		/*base: false*/
	},

	regex: /^(?:(\w+):)?(?:\/\/(?:(?:([^:@\/]*):?([^:@\/]*))?@)?([^:\/?#]*)(?::(\d*))?)?(\.\.?$|(?:[^?#\/]*\/)*)([^?#]*)(?:\?([^#]*))?(?:#(.*))?/,
	parts: ['scheme', 'user', 'password', 'host', 'port', 'directory', 'file', 'query', 'fragment'],
	schemes: {http: 80, https: 443, ftp: 21, rtsp: 554, mms: 1755, file: 0},

	initialize: function(uri, options){
		this.setOptions(options);
		var base = this.options.base || URI.base;
		if (!uri) uri = base;

		if (uri && uri.parsed) this.parsed = Object.clone(uri.parsed);
		else this.set('value', uri.href || uri.toString(), base ? new URI(base) : false);
	},

	parse: function(value, base){
		var bits = value.match(this.regex);
		if (!bits) return false;
		bits.shift();
		return this.merge(bits.associate(this.parts), base);
	},

	merge: function(bits, base){
		if ((!bits || !bits.scheme) && (!base || !base.scheme)) return false;
		if (base){
			this.parts.every(function(part){
				if (bits[part]) return false;
				bits[part] = base[part] || '';
				return true;
			});
		}
		bits.port = bits.port || this.schemes[bits.scheme.toLowerCase()];
		bits.directory = bits.directory ? this.parseDirectory(bits.directory, base ? base.directory : '') : '/';
		return bits;
	},

	parseDirectory: function(directory, baseDirectory){
		directory = (directory.substr(0, 1) == '/' ? '' : (baseDirectory || '/')) + directory;
		if (!directory.test(URI.regs.directoryDot)) return directory;
		var result = [];
		directory.replace(URI.regs.endSlash, '').split('/').each(function(dir){
			if (dir == '..' && result.length > 0) result.pop();
			else if (dir != '.') result.push(dir);
		});
		return result.join('/') + '/';
	},

	combine: function(bits){
		return bits.value || bits.scheme + '://' +
			(bits.user ? bits.user + (bits.password ? ':' + bits.password : '') + '@' : '') +
			(bits.host || '') + (bits.port && bits.port != this.schemes[bits.scheme] ? ':' + bits.port : '') +
			(bits.directory || '/') + (bits.file || '') +
			(bits.query ? '?' + bits.query : '') +
			(bits.fragment ? '#' + bits.fragment : '');
	},

	set: function(part, value, base){
		if (part == 'value'){
			var scheme = value.match(URI.regs.scheme);
			if (scheme) scheme = scheme[1];
			if (scheme && this.schemes[scheme.toLowerCase()] == null) this.parsed = { scheme: scheme, value: value };
			else this.parsed = this.parse(value, (base || this).parsed) || (scheme ? { scheme: scheme, value: value } : { value: value });
		} else if (part == 'data'){
			this.setData(value);
		} else {
			this.parsed[part] = value;
		}
		return this;
	},

	get: function(part, base){
		switch (part){
			case 'value': return this.combine(this.parsed, base ? base.parsed : false);
			case 'data' : return this.getData();
		}
		return this.parsed[part] || '';
	},

	go: function(){
		document.location.href = this.toString();
	},

	toURI: function(){
		return this;
	},

	getData: function(key, part){
		var qs = this.get(part || 'query');
		if (!(qs || qs === 0)) return key ? null : {};
		var obj = qs.parseQueryString();
		return key ? obj[key] : obj;
	},

	setData: function(values, merge, part){
		if (typeof values == 'string'){
			var data = this.getData();
			data[arguments[0]] = arguments[1];
			values = data;
		} else if (merge){
			values = Object.merge(this.getData(), values);
		}
		return this.set(part || 'query', Object.toQueryString(values));
	},

	clearData: function(part){
		return this.set(part || 'query', '');
	},

	toString: toString,
	valueOf: toString

});

URI.regs = {
	endSlash: /\/$/,
	scheme: /^(\w+):/,
	directoryDot: /\.\/|\.$/
};

URI.base = new URI(Array.from(document.getElements('base[href]', true)).getLast(), {base: document.location});

String.implement({

	toURI: function(options){
		return new URI(this, options);
	}

});

})();


/*
---

script: SideBar.js

description: Provides the TOC UI.

requires:
 - Core/DomReady
 - More/Element.Shortcuts
 - Core/Fx.Transitions
 - Fx.Scrollability
 - More/URI

provides: [TOC]

...
*/

var TOC = new Class({
	Implements: [Options, Events],
	options: {
		selected: null
	},
	initialize: function(options){
		this.setOptions(options);
		this.element = new Element('div.hidden.toc-container').inject(document.body);
		this.element.addEvent('click:relay(a.close)', this.hide.bind(this));
	},
	hide: function(){
		if (this.hidden) return;
		this.element.hide();
		this.hidden = true;
	},
	show: function(){
		if (!this.hidden) return;
		if (!this.retrieved) {
			this.nav = this.getNav();
		}
		this.element.setStyles({
			opacity: 0,
			display: 'block'
		});
		this.select(this.options.selected);
		this.element.setStyles({
			opacity: 1
		});
		this.hidden = false;
	},
	hidden: true,
	toggle: function(){
		if (this.hidden) this.show();
		else this.hide();
	},
	getNav: function(){
		if (this.retrieved) return;
		var xmlhttp = new XMLHttpRequest();
		xmlhttp.open("GET","toc.html",false);
		xmlhttp.send();
		txt = xmlhttp.responseText;
		this.element.set('html', txt);
		this.retrieved = true;
		this.chapters = this.element.getElement('.chapters');
		this.fx = new Fx.Scrollability(this.chapters, {
			duration: 0
		});
	},
	select: function(selected){
		if (selected) {
			var targets = this.chapters.getElements('a[href=' + selected + ']');
			if (targets.length<=0) return;
			targets.each(function(target) {
				target.getParent().addClass('selected');
				var chapter;
				if (target.getParent('dd.contents, dd.figures')) chapter = target.getParent('dd.contents, dd.figures').getPrevious('dt');
				else chapter = target.getParent('dt');
				if (chapter) this.fx.toElement(chapter.addClass('selected'));
			}.bind(this));
			//Scrolling into view
			targets[0].getParent().scrollIntoView();
		}
	}
});


window.addEvent('domready', function(){
	if (document.body.hasClass('no-toc')) return;
	//NOTE: ADDED AS TOC WAS GETTING ADDED IN EVERY PAGE - Nachiket
	if (!document.body.hasClass('toc')) return;

	var selected = $(document.body).getAttribute('data-toc-page-name');
	var toc = new TOC({
		selected: selected || new URI().get('file')
	});
	
	new Element('a', {
		'class': 'tocLink',
		text: 'TOC',
		events: {
			click: function(e){
				e.stop();
				toc.toggle();
			}
		}
	}).inject(document.body, 'top');
	document.body.addEvent('click', function(e){
		if (!e.target.getParent('.nav') && !toc.hidden) toc.hide();
	});
});

/*
---

name: Touch
description: Class to aid the retrieval of the cursor movements
license: MIT-Style License (http://mootools.net/license.txt)
copyright: Valerio Proietti (http://mad4milk.net)
requires: [Core/MooTools, Core/Array, Core/Function, Core/Number, Core/String, Core/Class, Core/Events, Core/Element]
provides: Touch

...
*/

var Touch = new Class({
	
	Implements: Events,
	
	initialize: function(element){
		this.element = document.id(element);
		
		this.bound = {
			start: this.start.bind(this),
			move: this.move.bind(this),
			end: this.end.bind(this)
		};
		
		if (Browser.Platform.ipod){
			this.context = this.element;
			this.startEvent = 'touchstart';
			this.endEvent = 'touchend';
			this.moveEvent = 'touchmove';
		} else {
			this.context = document;
			this.startEvent = 'mousedown';
			this.endEvent = 'mouseup';
			this.moveEvent = 'mousemove';
		}
		
		this.attach();
	},
	
	// public methods
	
	attach: function(){
		this.element.addListener(this.startEvent, this.bound.start);
	},
	
	detach: function(){
		this.element.removeListener(this.startEvent, this.bound.start);
	},
	
	// protected methods
	
	start: function(event){
		this.preventDefault(event);
		// this prevents the copy-paste dialog to show up when dragging. it only affects mobile safari.
		document.body.style.WebkitUserSelect = 'none';
		
		this.hasDragged = false;
		
		this.context.addListener(this.moveEvent, this.bound.move);
		this.context.addListener(this.endEvent, this.bound.end);
		
		var page = this.getPage(event);
			
		this.startX = page.pageX;
		this.startY = page.pageY;
		
		this.fireEvent('start');
	},
	
	move: function(event){
		this.preventDefault(event);
		
		var page = this.getPage(event);
		
		this.deltaX = page.pageX - this.startX;
		this.deltaY = page.pageY - this.startY;
		
		this.hasDragged = !(this.deltaX === 0 && this.deltaY === 0);
		
		if (this.hasDragged) this.fireEvent('move', [this.deltaX, this.deltaY]);
	},
	
	end: function(event){
		this.preventDefault(event);
		// we re-enable the copy-paste dialog on drag end
		document.body.style.WebkitUserSelect = '';
		
		this.context.removeListener(this.moveEvent, this.bound.move);
		this.context.removeListener(this.endEvent, this.bound.end);

		this.fireEvent((this.hasDragged) ? 'end' : 'cancel');
	},
	
	preventDefault: function(event){
		if (event.preventDefault) event.preventDefault();
		else event.returnValue = false;
	},
	
	getPage: function(event){
		//when on mobile safari, the coordinates information is inside the targetTouches object
		if (event.targetTouches) event = event.targetTouches[0];
		if (event.pageX != null && event.pageY != null) return {pageX: event.pageX, pageY: event.pageY};
		var element = (!document.compatMode || document.compatMode == 'CSS1Compat') ? document.documentElement : document.body;
		return {pageX: event.clientX + element.scrollLeft, pageY: event.clientY + element.scrollTop};
	}
	
});

Touch.build = "%build%";

/*
---

script: SideBar.js

description: Provides the TOC UI.

requires:
 - Touch
 - Core/Fx
 - More/Assets
 - Behavior/Behavior
 - More/Object.Extras

provides: [TOC, TOC.Nav]

...
*/

var ThreeSixty = new Class({
	Implements: [Options, Events],
	options: {
		/*
			onProgress: function(percent, index, source){
				console.log('loaded ' + percent + '% index: ' + index);
			},
			ready: function(){
				//all images loaded
			},
			//if no image is defined as already in the DOM, one will be injected in the container
			image: elmentIdOrReference,
		*/
		images: {
			//how many images
			count: 72,
			//path to images with ## for number values; note that this is padded with a zero, so 01-09, 10, 11, etc
			path: 'images/Seq_v04_640x378_##.jpg'
		},
		//when the user flicks, how many rotations can the thing go (maximum) before it stops
		maxFlickMultiplier: 1,
		//how far the flick has to be for there to be a transition at all on flick
		minFlick: 5,
		//the distance in pixels it takes to rotate the view; controls how "fast" it feels
		rotateDistance: 1000,
		//play the animation on startup?
		playIntro: true,
		//Determine whether image is full 360 or not
		full360: true
	},
	/*
		state variables
	*/
	//the current frame
	current: 0,
	//a history of positions, updated periodically; used to compute the "flick" velocity
	history: [0],
	//the position when a drag event starts
	dragStartPos: 0,
	//array of image sources for our animation (computed by computeSources method)
	sources: [],

	initialize: function(container, options){
		this.element = document.id(container);
		this.setOptions(options);
		this.attach();
		this.computeSources();
		this.makeImg();
		this.makeFx();
		this.preload();
	},
	//get a reference to or create an image for our animation
	makeImg: function(){
		if (this.options.image) this.img = document.id(this.options.image);
		if (!this.img){
			//create a new image and inject it in our target if there isn't one
			this.img = new Element('img', {
				src: this.sources[0]
			}).inject(this.element);
		}
	},
	makeFx: function(){
		//create an fx object for spinning
		this.fx = new Fx({
			transition: Fx.Transitions.Quad.easeOut,
			fps: 120
		});
		//define the set method for our Fx instance as rotating the image
		this.fx.set = function(i){
			this.show(i.round());
		}.bind(this);
	},
	//define the sources for all the images in the set; put them in this.sources array
	computeSources: function(){
		var path = this.options.images.path.split('##');
		this.options.images.count.times(function(i){
			this.sources.push(path[0] + this.pad(i + 1, 2) + path[1]);
		}, this);
		return this.sources;
	},
	//preload all the images before we run the animation
	preload: function(){
		Asset.images(this.sources, {
			onProgress: function(counter, index, source){
				this.fireEvent('progress', [((counter / this.options.images.count) * 100).round(), index, source])
			}.bind(this),
			onComplete: function(){
				this.fireEvent('ready');
				if (this.options.playIntro) this.intro();
			}.bind(this)
		})
	},
	//play the intro animation
	intro: function(){
		//play a little slower for the intro
		this.fx.options.duration = 1000;
		//start the animation
		this.fx.start(this.current, this.options.images.count).chain(function(){
			//when it finishes, put the duration back
			this.fx.options.duration = 500;
			//set the current frame
			this.current = this.options.images.count;
		}.bind(this));
	},
	//method to pad a number a given digits
	//i.e. this.pad(1, 2, '0') returns '01'
	pad: function(n, digits, string){
		if (digits == 1) return n;
		return n < Math.pow(10, digits - 1) ? (string || '0') + this.pad(n, digits - 1, string) : n;
	},
	//attach the drag event logic; uses Touch.js for this
	attach: function(){
		this.touch = new Touch(this.element).addEvents({
			start: this.startDrag.bind(this),
			end: this.endDrag.bind(this),
			move: this.drag.bind(this)
		});
	},
	//fired when dragging starts
	startDrag: function(){
		//cancel any running effect (a flick or the intro)
		this.fx.cancel();
		//set the start position
		this.dragStartPos = this.current;
		//reset the history
		this.history.empty();
		this.dragOffset = 0;
		//push the location into the history every 15 ms; used to compute flick
		this.dragInterval = this.updateDragHistory.periodical(10, this);
		this.updateDragHistory();
	},
	//updates the drag position in the history
	updateDragHistory: function(){
		//put the current position at the beginning
		this.history.unshift(this.dragOffset);
		//keep the array at 3 long for teh memories
		if (this.history.length > 3) this.history.pop();
	},
	//on drag end, clear the interval and fire the flick
	endDrag: function(){
		clearInterval(this.dragInterval);
		//get the distance moved from the history (30 ms ago)
		var flick = (this.history.getLast() - this.dragOffset);
		//get the size of the container
		var size = this.element.getSize().x;
		//rotate based on the relative size of the container,
		//i.e. if you moved 1x the size of the container in 30ms
		//rotate 1 full time. if you moved only .5x, rotate a half turn, etc.
		var rotation = (flick / size) * this.options.images.count;
		this.flick(rotation.round());
	},
	//drag handler; figures out rotation position based on drag offset
	//x = integer of drag offset
	drag: function(x){
		this.dragOffset = x;
		//compute the frame distance as the drag distance devided by the distance one must drag for a full rotation
		var percentDiffX = x / this.options.rotateDistance,
				//and the frame we're on is the image count times that percent offset
				frameDiffX = (this.options.images.count * percentDiffX).round();
		//now rotate the negative of that number, because in iOS we follow the finger, not the "scroll bar" as on the web
		this.rotate(-frameDiffX);
	},
	//rotate the image by x frames
	rotate: function(offset){
		if(this.options.full360) {
			//compute the image index to display
			//get the offset from the start position and wrap it at the image count size
			var index = (offset + this.dragStartPos) % this.options.images.count;
			if (index < 0) index = this.options.images.count + index;
			this.show(index);
		} else {
			//Do not allow rotation
			var index = offset + this.dragStartPos;
			if(index >= 0 && index < this.options.images.count) {
				this.show(index);
			}
		}
		
	},
	show: function(index){
		//handle the possibility that something has gone wrong and we're trying to set an image source that isn't valid
		if (this.sources[index]) {
			//set the image source
			this.img.src = this.sources[index];
			//update the current position
			this.current = index;
			this.fireEvent('changed', {'index': this.current});
		}
	},
	//animate the rotation a given distance (number of frames) by a factor of 2
	flick: function(distance){
		//if it's not at least the minFlick value, exit
		if (distance.abs() < this.options.minFlick) return;
		//if it's greater than the maxFlickMultiplier * the image count, use that max value
		if (distance.abs() > this.options.maxFlickMultiplier * this.options.images.count) {
			distance = this.options.maxFlickMultiplier * this.options.images.count * (distance > 0 ? 1 : -1);
		}
		//if the distance value was postive, make the dist value negative to get the spin direction correct
			this.fx.start(this.current, this.current + distance);
	}
});

//some cross-lib compatibility; Touch.js and MooTools 1.3 aren't quite in sync
if (Browser.Platform.ios) Browser.Platform.ipod = true;


Behavior.addGlobalFilters({
	ThreeSixty: {
		defaults: {
			playIntro: false,
			image: 'img.frame'
		},
		setup: function(element, api){
			var ts = new ThreeSixty(element,
				Object.merge(
					{
						image: element.getElement(api.get('image'))
					},
					Object.cleanValues(
						api.getAs({
							images: Object,
							playIntro: Boolean
						})
					)
				)
			);
			return ts;
		}
	}
});

/*
---

script: Drag.js

name: Drag

description: The base Drag Class. Can be used to drag and resize Elements using mouse events.

license: MIT-style license

authors:
  - Valerio Proietti
  - Tom Occhinno
  - Jan Kassens

requires:
  - Core/Events
  - Core/Options
  - Core/Element.Event
  - Core/Element.Style
  - Core/Element.Dimensions
  - /MooTools.More

provides: [Drag]
...

*/

var Drag = new Class({

	Implements: [Events, Options],

	options: {/*
		onBeforeStart: function(thisElement){},
		onStart: function(thisElement, event){},
		onSnap: function(thisElement){},
		onDrag: function(thisElement, event){},
		onCancel: function(thisElement){},
		onComplete: function(thisElement, event){},*/
		snap: 6,
		unit: 'px',
		grid: false,
		style: true,
		limit: false,
		handle: false,
		invert: false,
		preventDefault: false,
		stopPropagation: false,
		modifiers: {x: 'left', y: 'top'}
	},

	initialize: function(){
		var params = Array.link(arguments, {
			'options': Type.isObject,
			'element': function(obj){
				return obj != null;
			}
		});

		this.element = document.id(params.element);
		this.document = this.element.getDocument();
		this.setOptions(params.options || {});
		var htype = typeOf(this.options.handle);
		this.handles = ((htype == 'array' || htype == 'collection') ? $$(this.options.handle) : document.id(this.options.handle)) || this.element;
		this.mouse = {'now': {}, 'pos': {}};
		this.value = {'start': {}, 'now': {}};

		this.selection = (Browser.ie) ? 'selectstart' : 'mousedown';


		if (Browser.ie && !Drag.ondragstartFixed){
			document.ondragstart = Function.from(false);
			Drag.ondragstartFixed = true;
		}

		this.bound = {
			start: this.start.bind(this),
			check: this.check.bind(this),
			drag: this.drag.bind(this),
			stop: this.stop.bind(this),
			cancel: this.cancel.bind(this),
			eventStop: Function.from(false)
		};
		this.attach();
	},

	attach: function(){
		this.handles.addEvent('mousedown', this.bound.start);
		return this;
	},

	detach: function(){
		this.handles.removeEvent('mousedown', this.bound.start);
		return this;
	},

	start: function(event){
		var options = this.options;

		if (event.rightClick) return;

		if (options.preventDefault) event.preventDefault();
		if (options.stopPropagation) event.stopPropagation();
		this.mouse.start = event.page;

		this.fireEvent('beforeStart', this.element);

		var limit = options.limit;
		this.limit = {x: [], y: []};

		var z, coordinates;
		for (z in options.modifiers){
			if (!options.modifiers[z]) continue;

			var style = this.element.getStyle(options.modifiers[z]);

			// Some browsers (IE and Opera) don't always return pixels.
			if (style && !style.match(/px$/)){
				if (!coordinates) coordinates = this.element.getCoordinates(this.element.getOffsetParent());
				style = coordinates[options.modifiers[z]];
			}

			if (options.style) this.value.now[z] = (style || 0).toInt();
			else this.value.now[z] = this.element[options.modifiers[z]];

			if (options.invert) this.value.now[z] *= -1;

			this.mouse.pos[z] = event.page[z] - this.value.now[z];

			if (limit && limit[z]){
				var i = 2;
				while (i--){
					var limitZI = limit[z][i];
					if (limitZI || limitZI === 0) this.limit[z][i] = (typeof limitZI == 'function') ? limitZI() : limitZI;
				}
			}
		}

		if (typeOf(this.options.grid) == 'number') this.options.grid = {
			x: this.options.grid,
			y: this.options.grid
		};

		var events = {
			mousemove: this.bound.check,
			mouseup: this.bound.cancel
		};
		events[this.selection] = this.bound.eventStop;
		this.document.addEvents(events);
	},

	check: function(event){
		if (this.options.preventDefault) event.preventDefault();
		var distance = Math.round(Math.sqrt(Math.pow(event.page.x - this.mouse.start.x, 2) + Math.pow(event.page.y - this.mouse.start.y, 2)));
		if (distance > this.options.snap){
			this.cancel();
			this.document.addEvents({
				mousemove: this.bound.drag,
				mouseup: this.bound.stop
			});
			this.fireEvent('start', [this.element, event]).fireEvent('snap', this.element);
		}
	},

	drag: function(event){
		var options = this.options;

		if (options.preventDefault) event.preventDefault();
		this.mouse.now = event.page;

		for (var z in options.modifiers){
			if (!options.modifiers[z]) continue;
			this.value.now[z] = this.mouse.now[z] - this.mouse.pos[z];

			if (options.invert) this.value.now[z] *= -1;

			if (options.limit && this.limit[z]){
				if ((this.limit[z][1] || this.limit[z][1] === 0) && (this.value.now[z] > this.limit[z][1])){
					this.value.now[z] = this.limit[z][1];
				} else if ((this.limit[z][0] || this.limit[z][0] === 0) && (this.value.now[z] < this.limit[z][0])){
					this.value.now[z] = this.limit[z][0];
				}
			}

			if (options.grid[z]) this.value.now[z] -= ((this.value.now[z] - (this.limit[z][0]||0)) % options.grid[z]);

			if (options.style) this.element.setStyle(options.modifiers[z], this.value.now[z] + options.unit);
			else this.element[options.modifiers[z]] = this.value.now[z];
		}

		this.fireEvent('drag', [this.element, event]);
	},

	cancel: function(event){
		this.document.removeEvents({
			mousemove: this.bound.check,
			mouseup: this.bound.cancel
		});
		if (event){
			this.document.removeEvent(this.selection, this.bound.eventStop);
			this.fireEvent('cancel', this.element);
		}
	},

	stop: function(event){
		var events = {
			mousemove: this.bound.drag,
			mouseup: this.bound.stop
		};
		events[this.selection] = this.bound.eventStop;
		this.document.removeEvents(events);
		if (event) this.fireEvent('complete', [this.element, event]);
	}

});

Element.implement({

	makeResizable: function(options){
		var drag = new Drag(this, Object.merge({
			modifiers: {
				x: 'width',
				y: 'height'
			}
		}, options));

		this.store('resizer', drag);
		return drag.addEvent('drag', function(){
			this.fireEvent('resize', drag);
		}.bind(this));
	}

});


/*
---

script: Drag.Move.js

name: Drag.Move

description: A Drag extension that provides support for the constraining of draggables to containers and droppables.

license: MIT-style license

authors:
  - Valerio Proietti
  - Tom Occhinno
  - Jan Kassens
  - Aaron Newton
  - Scott Kyle

requires:
  - Core/Element.Dimensions
  - /Drag

provides: [Drag.Move]

...
*/

Drag.Move = new Class({

	Extends: Drag,

	options: {/*
		onEnter: function(thisElement, overed){},
		onLeave: function(thisElement, overed){},
		onDrop: function(thisElement, overed, event){},*/
		droppables: [],
		container: false,
		precalculate: false,
		includeMargins: true,
		checkDroppables: true
	},

	initialize: function(element, options){
		this.parent(element, options);
		element = this.element;

		this.droppables = $$(this.options.droppables);
		this.container = document.id(this.options.container);

		if (this.container && typeOf(this.container) != 'element')
			this.container = document.id(this.container.getDocument().body);

		if (this.options.style){
			if (this.options.modifiers.x == 'left' && this.options.modifiers.y == 'top'){
				var parent = element.getOffsetParent(),
					styles = element.getStyles('left', 'top');
				if (parent && (styles.left == 'auto' || styles.top == 'auto')){
					element.setPosition(element.getPosition(parent));
				}
			}

			if (element.getStyle('position') == 'static') element.setStyle('position', 'absolute');
		}

		this.addEvent('start', this.checkDroppables, true);
		this.overed = null;
	},

	start: function(event){
		if (this.container) this.options.limit = this.calculateLimit();

		if (this.options.precalculate){
			this.positions = this.droppables.map(function(el){
				return el.getCoordinates();
			});
		}

		this.parent(event);
	},

	calculateLimit: function(){
		var element = this.element,
			container = this.container,

			offsetParent = document.id(element.getOffsetParent()) || document.body,
			containerCoordinates = container.getCoordinates(offsetParent),
			elementMargin = {},
			elementBorder = {},
			containerMargin = {},
			containerBorder = {},
			offsetParentPadding = {};

		['top', 'right', 'bottom', 'left'].each(function(pad){
			elementMargin[pad] = element.getStyle('margin-' + pad).toInt();
			elementBorder[pad] = element.getStyle('border-' + pad).toInt();
			containerMargin[pad] = container.getStyle('margin-' + pad).toInt();
			containerBorder[pad] = container.getStyle('border-' + pad).toInt();
			offsetParentPadding[pad] = offsetParent.getStyle('padding-' + pad).toInt();
		}, this);

		var width = element.offsetWidth + elementMargin.left + elementMargin.right,
			height = element.offsetHeight + elementMargin.top + elementMargin.bottom,
			left = 0,
			top = 0,
			right = containerCoordinates.right - containerBorder.right - width,
			bottom = containerCoordinates.bottom - containerBorder.bottom - height;

		if (this.options.includeMargins){
			left += elementMargin.left;
			top += elementMargin.top;
		} else {
			right += elementMargin.right;
			bottom += elementMargin.bottom;
		}

		if (element.getStyle('position') == 'relative'){
			var coords = element.getCoordinates(offsetParent);
			coords.left -= element.getStyle('left').toInt();
			coords.top -= element.getStyle('top').toInt();

			left -= coords.left;
			top -= coords.top;
			if (container.getStyle('position') != 'relative'){
				left += containerBorder.left;
				top += containerBorder.top;
			}
			right += elementMargin.left - coords.left;
			bottom += elementMargin.top - coords.top;

			if (container != offsetParent){
				left += containerMargin.left + offsetParentPadding.left;
				top += ((Browser.ie6 || Browser.ie7) ? 0 : containerMargin.top) + offsetParentPadding.top;
			}
		} else {
			left -= elementMargin.left;
			top -= elementMargin.top;
			if (container != offsetParent){
				left += containerCoordinates.left + containerBorder.left;
				top += containerCoordinates.top + containerBorder.top;
			}
		}

		return {
			x: [left, right],
			y: [top, bottom]
		};
	},

	getDroppableCoordinates: function(element){
		var position = element.getCoordinates();
		if (element.getStyle('position') == 'fixed'){
			var scroll = window.getScroll();
			position.left += scroll.x;
			position.right += scroll.x;
			position.top += scroll.y;
			position.bottom += scroll.y;
		}
		return position;
	},

	checkDroppables: function(){
		var overed = this.droppables.filter(function(el, i){
			el = this.positions ? this.positions[i] : this.getDroppableCoordinates(el);
			var now = this.mouse.now;
			return (now.x > el.left && now.x < el.right && now.y < el.bottom && now.y > el.top);
		}, this).getLast();

		if (this.overed != overed){
			if (this.overed) this.fireEvent('leave', [this.element, this.overed]);
			if (overed) this.fireEvent('enter', [this.element, overed]);
			this.overed = overed;
		}
	},

	drag: function(event){
		this.parent(event);
		if (this.options.checkDroppables && this.droppables.length) this.checkDroppables();
	},

	stop: function(event){
		this.checkDroppables();
		this.fireEvent('drop', [this.element, this.overed, event]);
		this.overed = null;
		return this.parent(event);
	}

});

Element.implement({

	makeDraggable: function(options){
		var drag = new Drag.Move(this, options);
		this.store('dragger', drag);
		return drag;
	}

});


/*
---

script: Class.Refactor.js

name: Class.Refactor

description: Extends a class onto itself with new property, preserving any items attached to the class's namespace.

license: MIT-style license

authors:
  - Aaron Newton

requires:
  - Core/Class
  - /MooTools.More

# Some modules declare themselves dependent on Class.Refactor
provides: [Class.refactor, Class.Refactor]

...
*/

Class.refactor = function(original, refactors){

	Object.each(refactors, function(item, name){
		var origin = original.prototype[name];
		origin = (origin && origin.$origin) || origin || function(){};
		original.implement(name, (typeof item == 'function') ? function(){
			var old = this.previous;
			this.previous = origin;
			var value = item.apply(this, arguments);
			this.previous = old;
			return value;
		} : item);
	});

	return original;

};


/*
---
script: metrodigi-drag-touch.js

description: Refines Mootools Drag class, and adds Touch capabilities to it. 

requires:
 - More/Drag
 - More/Drag.Move
 - More/Class.refactor

provides: [mootools.touch, mootools.drag]

...
*/

Class.refactor(Drag,{
    attach: function(){
        this.handles.addEvent('touchstart', this.bound.start);
        return this.previous.apply(this, arguments);
    },

    detach: function(){
        this.handles.removeEvent('touchstart', this.bound.start);
        return this.previous.apply(this, arguments);
    },

    start: function(event){
        document.body.addEvents({
            touchmove: this.bound.check,
            touchend: this.bound.cancel
        });
        this.previous.apply(this, arguments);
    },

    check: function(event){
        if (this.options.preventDefault) event.preventDefault();
        var distance = Math.round(Math.sqrt(Math.pow(event.page.x - this.mouse.start.x, 2) + Math.pow(event.page.y - this.mouse.start.y, 2)));
        if (distance > this.options.snap){
            this.cancel();
            this.document.addEvents({
                mousemove: this.bound.drag,
                mouseup: this.bound.stop
            });
            document.body.addEvents({
                touchmove: this.bound.drag,
                touchend: this.bound.stop
            });
            this.fireEvent('start', [this.element, event]).fireEvent('snap', this.element);
        }
    },

    cancel: function(event) {
        document.body.removeEvents({
            touchmove: this.bound.check,
            touchend: this.bound.cancel
        });
        return this.previous.apply(this, arguments);
    },

    stop: function(event){
        document.body.removeEvents({
            touchmove: this.bound.drag,
            touchend: this.bound.stop
        });
        return this.previous.apply(this, arguments);
    }
});

/*
---
script: metrodigi-drag-scroll.js

description: Scrolling implementation using Drag. 

requires:
 - More/Drag
 - More/Fx.Scroll

provides: [Drag.Scroll]

...
*/
(function(){

Drag.Scroll = new Class({

  // We'd like to use the Options Class Mixin
  Implements: [Options],

  // Default options
  options: {
    friction: 5,
    axis: {x: true, y: true}
  },

  initialize: function(element, options){
    element = this.element = document.id(element);
    this.content = element.getFirst();
    this.setOptions(options);

    // Drag speed
    var prevTime, prevScroll, speed, scroll, timer;
    var timerFn = function(){
      var now = Date.now();
      scroll = [element.scrollLeft, element.scrollTop];
      if (prevTime){
        var dt = now - prevTime + 1;
        speed = [
          1000 * (scroll[0] - prevScroll[0]) / dt,
          1000 * (scroll[1] - prevScroll[1]) / dt
        ];
      }
      prevScroll = scroll;
      prevTime = now;
    };
  
    // Use Fx.Scroll for scrolling to the right position after the dragging
    var fx = this.fx = new Fx.Scroll(element, {
      transition: Fx.Transitions.Expo.easeOut
    });

    // Set initial scroll
    fx.set.apply(fx, this.limit(element.scrollLeft, element.scrollTop));

    var self = this;
      friction = this.options.friction,
      axis = this.options.axis;

    // Make the element draggable
    var drag = this.drag = new Drag(element, {
      style: false,
      invert: true,
      modifiers: {x: axis.x && 'scrollLeft', y: axis.y && 'scrollTop'},
      onStart: function(){
        // Start the speed measuring
        timerFn();
        timer = setInterval(timerFn, 1000 / 60);
        // cancel any fx if they are still running
        fx.cancel();
      },
      onComplete: function(){
        // Stop the speed measuring
        prevTime = false;
        clearInterval(timer);
        // Scroll to the new location
        fx.start.apply(fx, self.limit(
          scroll[0] + (speed[0] || 0) / friction,
          scroll[1] + (speed[1] || 0) / friction
        ));
      }
    });

  },

  // Calculate the limits
  getLimit: function(){
    var limit = [[0, 0], [0, 0]], element = this.element;
    var styles = Object.values(this.content.getStyles(
      'padding-left', 'border-left-width', 'margin-left',
      'padding-top', 'border-top-width', 'margin-top',
      'width', 'height'
    )).invoke('toInt');
    limit[0][0] = sum(styles.slice(0, 3));
    limit[0][1] = styles[6] + limit[0][0] - element.clientWidth;
    limit[1][0] = sum(styles.slice(3, 6));
    limit[1][1] = styles[7] + limit[1][0] - element.clientHeight;
    return limit;
  },

  // Apply the limits to the x and y values
  limit: function(x, y){
    var limit = this.getLimit();
    return [
      x.limit(limit[0][0], limit[0][1]),
      y.limit(limit[1][0], limit[1][1])
    ];
  }

});

var sum = function(array){
  var result = 0;
  for (var l = array.length; l--;) result += array[l];
  return result;
};

})();

var md = md || {};
md.widgets = md.widgets || {};

md.widgets.Accordion = new Class({
	Implements: [Events, Options],
	options: {
		mode: 'accordion',
		tabs: []
	},
	initialize: function (el, options) {
		this.el = el;
		this.setOptions(options);
		this['render-' + this.options.mode]();
	},
	'render-tabs': function () {
		var numberMap = {
			1:	'one',
			2:	'two',
			3:	'three',
			4:	'four',
			5:	'five',
			6:	'six',
			7:	'seven',
			8:	'eight',
			9:	'nine',
			10:	'ten',
			11:	'eleven',
			12:	'twelve'
		};
		var header = new Element('div', { 'class': 'header ' + numberMap[this.options.tabs.length] + '-tabs' }),
			content = new Element('div', { 'class': 'content' }),
			titles,
			bodies;

		titles = this.options.tabs.map(function (tab, i) {
			return new Element('div', {
					'class': 'tab-title' + (i === 0 ? ' active' : ''),
					'data-index': i,
					'html': '<p>' + tab.title + '</p>'
				})
				.addEvent('click', function (e) {
					var el = e.target.hasClass('tab-title') ? e.target : e.target.getParents('.tab-title')[0];

					// remove any active classes.
					this.el.getElements('.tab-title, .tab-content').removeClass('active');

					// Add active class to the title.
					el.addClass('active');

					// Add active class to the content.
					this.el.getElements('.tab-content')[el.get('data-index')].addClass('active');
				}.bind(this));
		}.bind(this));

		bodies = this.options.tabs.map(function (tab, i) {
			return new Element('div', { 'class': 'tab-content' + (i === 0 ? ' active' : ''), html: tab.content });
		});

		header.adopt(titles);
		content.adopt(bodies);

		this.el.addClass('accordion-widget').empty().adopt(header, content);
	},

// CHANGES

	'render-accordion': function () {
		var accordionItems = this.options.tabs.map(function (tab, i) {
			var wrapper = new Element('div', { 'class': 'accordion-item' }),
				title = new Element('div', { 'class': 'accordion-title', html: tab.title }),
				contentWrapper = new Element('div', { 'class': 'accordion-content-wrapper' }),
				content = new Element('div', { 'class': 'accordion-content', html: tab.content });

			title.addEvent('click', function (e) {
				if (e.target.getParent('.accordion-item').hasClass('active')) {
					e.target.getParent('.accordion-item').removeClass('active');
				} else {
					// this.el.getElements('.accordion-item').removeClass('active');
					$(e.target).getParent('.accordion-item').addClass('active');
				}

			}.bind(this));

			contentWrapper.adopt(content);
			return wrapper.adopt(title, contentWrapper);
		}.bind(this));



		var accordionItemsLength = accordionItems.length;
		if (accordionItemsLength > 1) { 

			var allContainer = new Element('div', { 'class': 'accordion-wrapper' });
			var openAll = new Element('div', { 'class': 'accordion-open-all', 'text': 'Expand All'});
			var closeAll = new Element('div', { 'class': 'accordion-close-all', 'text': 'Collapse All'});
			

			openAll.addEvent('click', function() {
				this.el.getElements('.accordion-item').addClass('active');
			}.bind(this));

			closeAll.addEvent('click', function() {
				this.el.getElements('.accordion-item').removeClass('active');
			}.bind(this));
		
			allContainer.adopt(openAll, closeAll);
			this.el.addClass('accordion-widget').empty().adopt(allContainer, accordionItems);
		} else {
			this.el.addClass('accordion-widget').empty().adopt(accordionItems);
		} 
		
	}
}); 

// CHANGES END


/*
---
script: metrodigi-media.js

description: Provides media (Audio / Video) related functions and objects 

requires: [Core/Core]

provides: [md.media]

...
*/
var md = md || {};
md.media = md.media || {};
md.media.AudioManager = new Class({
	Implements: [Options, Events],
	initialize:function(options){
		this.setOptions(options);
		this.map = {};
		if(this.options.audioUrlAttr) {
			var attr = '['+this.options.audioUrlAttr+']';
			Array.each($$(attr), function(imgEl){
			    var audioUrl = imgEl.getAttribute(this.options.audioUrlAttr);
				if(!this.hasAudio(audioUrl)) {
			    	this.addAudio(audioUrl);
			    	console.log('Audio registered. ', audioUrl);
				}
			}.bind(this));
		}
	},
	addAudio:function(url) {
		this.map[url] = new Audio(url);
		this.map[url].addEventListener('ended',function(){
			console.log('audio playing ended ' + url);
		});
		
	},
	hasAudio:function(url) {
		return this.map[url]!=undefined;
	},
	getAudio: function(url) {
		if(this.hasAudio === undefined) {
			throw('no audio found with url: ', url);
		}
		return this.map[url];
	},
	addAndGetAudio: function(url) {
		if(!this.hasAudio(url)) {
			this.addAudio(url);
		}
		return this.getAudio(url);
	},
	play:function(url, element) {
		var audio = this.map[url];
		
		if(this.isPlaying()) {
			if(this.playingAudio != audio ) {
				this.playingAudio.pause();
			} else {
				console.log('Not doing anything as Audio is already playing.');
				return;
			}
		}
		
		var self= this;
		var listenerFunction = function(){
			console.log('audio paused playing ' + url);
			self.fireEvent('audiostopped', {'url':url, 'audio':audio, 'element': element});
			audio.removeEventListener('pause', listenerFunction);
			self.playingAudio = undefined;
		};
		audio.addEventListener('pause',listenerFunction);
		// audio.addEventListener('timeupdate', function(e){	
		// 	console.log('time updated', e, audio.currentTime);
		// }.bind(this));
		console.log('playing ' + url);
		audio.play();
		this.playingAudio = audio;
	},
	isPlaying:function(url){
		if(url==undefined) {
			return this.playingAudio!=undefined && !this.playingAudio.paused;
		} else {
			if(this.playingAudio!=undefined) {
				return this.playingAudio == this.map[url];
			}
			return false;
		}
	},
	pause: function(url){
		var audio = this.map[url];
		audio.pause();
	},
	stop: function(url){
		var audio = this.map[url];
		audio.stop();
	}
	
});

md.media.AudioTextBinding = new Class({
	Implements: [Options, Events],
	options: {
		elAudioAttr: "data-audio",
		embedded: {
			elStartTimeAttr: "data-audio-start-time",
			elStopTimeAttr: "data-audio-stop-time",
			elDuration: "data-audio-duration",
			elSelector: '.audio-text'
		},
		activeClass: 'active',
		playedClass: 'played',
		embeddedConfig: false
	},
	dataList: [],
	initialize: function(container, audioManager, options){
		if(!container) {
			throw('container is not defined');
		}
		if(!audioManager) {
			throw('audioManager is not defined');
		}
		var audioUrl = container.getAttribute(this.options.elAudioAttr);
		if(!audioUrl) {
			throw(this.options.elAudioAttr + ' is compulsory attribute in Element');
		}
		this.container = container;
		this.setOptions(options);
		this.audio = audioManager.addAndGetAudio(audioUrl);
		this.audio.addEventListener('timeupdate', this.audioStep.bind(this));
		this.audio.addEventListener('ended', this.cleanup.bind(this));

		if(this.options.embeddedConfig) {
			this.setEmbeddedConfig();
		} else {
			this.setConfig();
		}
	}, 
	setEmbeddedConfig: function(){
		var els = this.container.getElements(this.options.embedded.elSelector);
		els.each(function(el) {
			var elData = {};
			elData.startTime= parseFloat(el.getAttribute(this.options.embedded.elStartTimeAttr));

			var elStopTime = el.getAttribute(this.options.embedded.elStopTimeAttr);
			var elDuration = el.getAttribute(this.options.embedded.elDuration);
			if(elStopTime) {
				elData.stopTime= parseFloat(elStopTime);
			} else {
				elData.duration= parseFloat(elDuration);
			}

			elData.active = false;
			elData.el = el;
			
			this.dataList.push(elData);
		}.bind(this));
	},
	setConfig: function(){
		if(!this.options.config) {
			throw('config option is not defined');
		}
		this.options.config.each(function(conf){
			var elData = conf;
			elData.active = false;
			elData.el = this.container.getElements(conf.selector);
			
			this.dataList.push(elData);
		}.bind(this));
	},
	audioStep: function(e){
		var time = this.audio.currentTime;
		this.dataList.each(function(elData) {
			var stopTime = elData.stopTime;
			if(stopTime == undefined) {
				stopTime = elData.startTime + elData.duration;
			}
			if(time > elData.startTime && time < stopTime) {
				if(elData.active === false) {
					elData.el.addClass(this.options.activeClass);
					// console.log('activated ', elData.el);
					elData.active=true;
				}
			} else {
				//IF Played Once
				if(elData.active === true) {
					elData.el.removeClass(this.options.activeClass);
					elData.el.addClass(this.options.playedClass);
					// console.log('deactivated ', elData.el);
					elData.active = false;
				}
			}
		}.bind(this))
	},
	cleanup: function() {
		console.log('cleaning up Elements');
		this.dataList.each(function(elData){
			elData.el.removeClass(this.options.activeClass);
			elData.el.removeClass(this.options.playedClass);
		}.bind(this));
	}
})

md.media.ui = md.media.ui || {};
md.media.ui.AudioControl = new Class({
	Implements: [Options, Events],
	options: {
		elAudioAttr: 'data-audio',
		playSelector: '.ac-play',
		pauseSelector: '.ac-stop',
	},
	initialize: function(container, audioManager, options){
		this.setOptions(options);
		this.container = container;
		
		if(!container) {
			throw('container is not defined');
		}
		if(!audioManager) {
			throw('audioManager is not defined');
		}
		this.audioUrl = container.getAttribute(this.options.elAudioAttr);
		if(!this.audioUrl) {
			throw(this.options.elAudioAttr + ' is compulsory attribute in Element');
		}
		
		this.audioManager = audioManager;
		this.audio = audioManager.addAndGetAudio(this.audioUrl);
		this.audio.addEventListener('ended',function(){
			this.resetControls();
		}.bind(this));
		
		this.playSelector = container.getElements(this.options.playSelector);
		this.pauseSelector = container.getElements(this.options.pauseSelector);
		
		this.resetControls();
		this.playSelector.addEvent('click', this.playHandler.bind(this));
		this.pauseSelector.addEvent('click', this.pauseHandler.bind(this));
	},
	resetControls: function(){
		this.pauseSelector.fade('hide');
		this.playSelector.fade('show');
	},
	playHandler: function(e){
		if(e) {
			e.stop();
		}
		this.audioManager.play(this.audioUrl);
		this.pauseSelector.fade('show');
		this.playSelector.fade('hide');
		this.playing = true;
	},
	pauseHandler: function(e){
		if(e) {
			e.stop();
		}
		this.audioManager.pause(this.audioUrl);
		this.pauseSelector.fade('hide');
		this.playSelector.fade('show');			
		this.playing = false;
	}
});

md.media.ui.AudioControlOverlay = new Class({
	Extends: md.media.ui.AudioControl,
	initialize: function(container, audioManager, animWrapper, options){
		this.parent(container, audioManager, options);
		this.wrapper = animWrapper;
		this.wrapper.addEvent('click', this.containerClicked.bind(this));
	},
	containerClicked: function(e){
		e.stop();
		if(this.playing) {
			this.pauseSelector.fade('in');
			setTimeout(function(){
				this.pauseSelector.fade('out');
			}.bind(this),600);
			
			//From this & parent pauseHandler();
			this.container.fade('show');
			setTimeout(function(){
				this.audioManager.pause(this.audioUrl);
				this.playSelector.fade('in');			
				this.playing = false;
			}.bind(this), 750);
		}
	},
	playHandler: function(e){
		this.parent(e);
		this.pauseSelector.fade('hide');		
		this.container.fade('out');
	},
	pauseHandler: function(e, delay){
		this.parent(e);
		this.container.fade('in');
	},
	resetControls: function(){
		this.parent();
		this.container.fade('in');
	},
	pause: function(){
		this.pauseHandler();
	}
});

/*
---

script: Fx.SmoothScroll.js

name: Fx.SmoothScroll

description: Class for creating a smooth scrolling effect to all internal links on the page.

license: MIT-style license

authors:
  - Valerio Proietti

requires:
  - Core/Slick.Finder
  - /Fx.Scroll

provides: [Fx.SmoothScroll]

...
*/

/*<1.2compat>*/var SmoothScroll = /*</1.2compat>*/Fx.SmoothScroll = new Class({

	Extends: Fx.Scroll,

	options: {
		axes: ['x', 'y']
	},

	initialize: function(options, context){
		context = context || document;
		this.doc = context.getDocument();
		this.parent(this.doc, options);

		var win = context.getWindow(),
			location = win.location.href.match(/^[^#]*/)[0] + '#',
			links = $$(this.options.links || this.doc.links);

		links.each(function(link){
			if (link.href.indexOf(location) != 0) return;
			var anchor = link.href.substr(location.length);
			if (anchor) this.useLink(link, anchor);
		}, this);

		this.addEvent('complete', function(){
			win.location.hash = this.anchor;
			this.element.scrollTo(this.to[0], this.to[1]);
		}, true);
	},

	useLink: function(link, anchor){

		link.addEvent('click', function(event){
			var el = document.id(anchor) || this.doc.getElement('a[name=' + anchor + ']');
			if (!el) return;

			event.preventDefault();
			this.toElement(el, this.options.axes).chain(function(){
				this.fireEvent('scrolledTo', [link, el]);
			}.bind(this));

			this.anchor = anchor;

		}.bind(this));

		return this;
	}
});


/*
---

script: Slider.js

name: Slider

description: Class for creating horizontal and vertical slider controls.

license: MIT-style license

authors:
  - Valerio Proietti

requires:
  - Core/Element.Dimensions
  - /Class.Binds
  - /Drag
  - /Element.Measure

provides: [Slider]

...
*/

var Slider = new Class({

	Implements: [Events, Options],

	Binds: ['clickedElement', 'draggedKnob', 'scrolledElement'],

	options: {/*
		onTick: function(intPosition){},
		onChange: function(intStep){},
		onComplete: function(strStep){},*/
		onTick: function(position){
			this.setKnobPosition(position);
		},
		initialStep: 0,
		snap: false,
		offset: 0,
		range: false,
		wheel: false,
		steps: 100,
		mode: 'horizontal'
	},

	initialize: function(element, knob, options){
		this.setOptions(options);
		options = this.options;
		this.element = document.id(element);
		knob = this.knob = document.id(knob);
		this.previousChange = this.previousEnd = this.step = -1;

		var limit = {},
			modifiers = {x: false, y: false};

		switch (options.mode){
			case 'vertical':
				this.axis = 'y';
				this.property = 'top';
				this.offset = 'offsetHeight';
				break;
			case 'horizontal':
				this.axis = 'x';
				this.property = 'left';
				this.offset = 'offsetWidth';
		}

		this.setSliderDimensions();
		this.setRange(options.range);

		if (knob.getStyle('position') == 'static') knob.setStyle('position', 'relative');
		knob.setStyle(this.property, -options.offset);
		modifiers[this.axis] = this.property;
		limit[this.axis] = [-options.offset, this.full - options.offset];

		var dragOptions = {
			snap: 0,
			limit: limit,
			modifiers: modifiers,
			onDrag: this.draggedKnob,
			onStart: this.draggedKnob,
			onBeforeStart: (function(){
				this.isDragging = true;
			}).bind(this),
			onCancel: function(){
				this.isDragging = false;
			}.bind(this),
			onComplete: function(){
				this.isDragging = false;
				this.draggedKnob();
				this.end();
			}.bind(this)
		};
		if (options.snap) this.setSnap(dragOptions);

		this.drag = new Drag(knob, dragOptions);
		this.attach();
		if (options.initialStep != null) this.set(options.initialStep);
	},

	attach: function(){
		this.element.addEvent('mousedown', this.clickedElement);
		if (this.options.wheel) this.element.addEvent('mousewheel', this.scrolledElement);
		this.drag.attach();
		return this;
	},

	detach: function(){
		this.element.removeEvent('mousedown', this.clickedElement)
			.removeEvent('mousewheel', this.scrolledElement);
		this.drag.detach();
		return this;
	},

	autosize: function(){
		this.setSliderDimensions()
			.setKnobPosition(this.toPosition(this.step));
		this.drag.options.limit[this.axis] = [-this.options.offset, this.full - this.options.offset];
		if (this.options.snap) this.setSnap();
		return this;
	},

	setSnap: function(options){
		if (!options) options = this.drag.options;
		options.grid = Math.ceil(this.stepWidth);
		options.limit[this.axis][1] = this.full;
		return this;
	},

	setKnobPosition: function(position){
		if (this.options.snap) position = this.toPosition(this.step);
		this.knob.setStyle(this.property, position);
		return this;
	},

	setSliderDimensions: function(){
		this.full = this.element.measure(function(){
			this.half = this.knob[this.offset] / 2;
			return this.element[this.offset] - this.knob[this.offset] + (this.options.offset * 2);
		}.bind(this));
		return this;
	},

	set: function(step){
		if (!((this.range > 0) ^ (step < this.min))) step = this.min;
		if (!((this.range > 0) ^ (step > this.max))) step = this.max;

		this.step = Math.round(step);
		return this.checkStep()
			.fireEvent('tick', this.toPosition(this.step))
			.end();
	},

	setRange: function(range, pos){
		this.min = Array.pick([range[0], 0]);
		this.max = Array.pick([range[1], this.options.steps]);
		this.range = this.max - this.min;
		this.steps = this.options.steps || this.full;
		this.stepSize = Math.abs(this.range) / this.steps;
		this.stepWidth = this.stepSize * this.full / Math.abs(this.range);
		if (range) this.set(Array.pick([pos, this.step]).floor(this.min).max(this.max));
		return this;
	},

	clickedElement: function(event){
		if (this.isDragging || event.target == this.knob) return;

		var dir = this.range < 0 ? -1 : 1,
			position = event.page[this.axis] - this.element.getPosition()[this.axis] - this.half;

		position = position.limit(-this.options.offset, this.full - this.options.offset);

		this.step = Math.round(this.min + dir * this.toStep(position));

		this.checkStep()
			.fireEvent('tick', position)
			.end();
	},

	scrolledElement: function(event){
		var mode = (this.options.mode == 'horizontal') ? (event.wheel < 0) : (event.wheel > 0);
		this.set(this.step + (mode ? -1 : 1) * this.stepSize);
		event.stop();
	},

	draggedKnob: function(){
		var dir = this.range < 0 ? -1 : 1,
			position = this.drag.value.now[this.axis];

		position = position.limit(-this.options.offset, this.full -this.options.offset);

		this.step = Math.round(this.min + dir * this.toStep(position));
		this.checkStep();
	},

	checkStep: function(){
		var step = this.step;
		if (this.previousChange != step){
			this.previousChange = step;
			this.fireEvent('change', step);
		}
		return this;
	},

	end: function(){
		var step = this.step;
		if (this.previousEnd !== step){
			this.previousEnd = step;
			this.fireEvent('complete', step + '');
		}
		return this;
	},

	toStep: function(position){
		var step = (position + this.options.offset) * this.stepSize / this.full * this.steps;
		return this.options.steps ? Math.round(step -= step % this.stepSize) : step;
	},

	toPosition: function(step){
		return (this.full * Math.abs(this.min - step)) / (this.steps * this.stepSize) - this.options.offset;
	}

});


/*
---
name: MD Slider
description: Animated picture slider, Extracted from- PictureSlider (https://github.com/peterkuma/picture-slider)
license: MIT-style
authors:
- Nachkiket Patel
- peterkuma

requires: [
Core/Class,
Core/Element.Style,
Core/Fx.Tween,
More/Fx.SmoothScroll,
More/Slider
]

provides: PictureSlider
...
*/
var md = md || {};
md.widget = md.widget || {}; 
md.widget.PictureSlider = new Class({
	Implements: [Options,Events],
	
	options: {
		duration: 'short',
		center: true,
		caption: {
			opacity: 0.8,
			duration: 'short'
		},
		text: {
			duration: 200
		}
	},

	initialize: function(obj, images, options) {
		this.setOptions(options);
		var this_ = this;
		
		this.images = [];
		this.current = null;
	
		this.obj = obj;
		obj.addClass('picture-slider');

		/* Determine width and height. */
		this.width = obj.getStyle('width').toInt();
		this.height = obj.getStyle('height').toInt();	
	
		/* Sheet. */
		this.sheet = new Element('div');
		this.sheet.addClass('ps-sheet');
		this.sheet.setStyle('width', this.width);
		this.sheet.setStyle('height', this.height);
		obj.appendChild(this.sheet);
	
		/* Place images on the sheet. */
		images.each(function(image) { this_.appendImage(image); });
		
		/* Bottom description panel. */
		this.caption = new Element('div');
		this.caption.addClass('ps-caption');
		this.caption.setStyle('height', 0);
		this.caption.setStyle('opacity', this.options.caption.opacity);
		this.caption.p = new Element('p');
		this.caption.p.set('tween', {duration: this.options.caption.duration});
		this.caption.appendChild(this.caption.p);
		this.obj.appendChild(this.caption);
		
		/* Keyboard control. */
		this.kb = null;
		if (typeof Keyboard != 'undefined') {
			this.kb = new Keyboard({
				defaultEventType: 'keydown',
				events: {
					'left': function() { this_.left(); },
					'right': function() { this_.right(); }
				}
			});
			this.kb.activate();
		}
		
		/* Switch to the first image. */	
		this.switchTo(0);
	},

	/*
	 * Switches to the image number n.
	 */
	switchTo: function(n) {
		if (!(n >= 0 && n < this.images.length))
			return this.current;
		
		this.current = this.images[n];
			
		var fx = new Fx.Tween(this.sheet, {
			duration: this.options.duration,
			property: 'left'
		});
		fx.start(-n*this.width);
			
		this.setCaption(this.current.caption);
		this.n = n;
		
		this.fireEvent('change', this.current);
		
		return this.current;
	},
	left: function() {	return this.switchTo(this.n - 1);  },
	right: function() {  return this.switchTo(this.n + 1);  },
	/*
	 * Appends image to the end.
	 */
	appendImage: function(image) {
		var frame;
		if (image.link) {
			frame = new Element('a');
			frame.href = image.link;
		} else {
			frame = new Element('div');
		}
		frame.addClass('ps-frame');
		frame.setStyle('left', this.width*this.images.length);
		frame.setStyle('width', this.width);
		frame.setStyle('height', this.height);
		this.sheet.appendChild(frame);
		
		var center = this.options.center;
		if (typeof image.center != 'undefined')
			center = image.center;
		
		if (image.src) {
			var img = new Element('img');
			img.addClass('ps-frame-image');
			img.src = image.src;
			frame.appendChild(img);
			var this_ = this;
			img.addEvent('load', function() {
				if (img.width/img.height > this_.width/this_.height) {
					img.width = this_.width;
				} else {
					img.height = this_.height;
				}
				if (center)
					img.setStyle('top', (this_.height-img.height)/2);
			});
		}
		
		if (image.content) {
			var content = new Element('div');
			content.addClass('ps-frame-content');
			frame.appendChild(content);
			if (typeof image.content == 'string') {
				content.set('html', image.content);
			}
			var w = content.getStyle('width').toInt();
			var pad = content.getStyle('padding-left').toInt() +
		    		  content.getStyle('padding-right').toInt();
		 	var mar = content.getStyle('margin-left').toInt() +
		   			  content.getStyle('margin-right').toInt();
			content.setStyle('left', (this.width-w-pad-mar)/2);
			if (center) {
				var h = content.getStyle('height').toInt();
				var pad = content.getStyle('padding-top').toInt() +
		    			  content.getStyle('padding-bottom').toInt();
		 		var mar = content.getStyle('margin-top').toInt() +
		   				  content.getStyle('margin-bottom').toInt();
		   		var top = (this.height-h-pad-mar)/2;
		   		if (top > 0)
					content.setStyle('top', (this.height-h-pad-mar)/2);
			}
		}
		
		this.images.push(image);
	},
	
	/*
	 * Set caption to text.
	 */
	setCaption: function(text) {
		var fx = new Fx.Tween(this.caption, {
			duration: this.options.text.duration,
			property: 'height',
			link: 'chain'
		});
		
		if (text) {
			var this_ = this;
			fx.addEvent('complete', function() {
				this_.caption.p.innerHTML = text;
				this_.caption.p.fade(1);
			});
			this.caption.p.fade(0);
			var tmpcaption = new Element('div');
			tmpcaption.addClass('ps-caption');
			tmpcaption.setStyle('visibility', 'hidden');
			tmpcaption.p = new Element('p');
			tmpcaption.p.innerHTML = text;
			tmpcaption.appendChild(tmpcaption.p);
			this.obj.appendChild(tmpcaption);
			h = tmpcaption.getStyle('height');
			this.obj.removeChild(tmpcaption);
			fx.start(h);		
		} else {
			this.caption.p.innerHTML = '';
			this.caption.p.fade(0);
			fx.start(0);		
		}
	}
});

md.widget.ImageCompareWidget = new Class({
	Implements: [Options,Events],
	options: {
		knobClass:'.md-knob',
		sliderClass:'.md-slider',
		frontImageWrapperClass:'.front-img-wrapper',
		imgContainerClass:'.img-container',
		initialPosition: 0
	},
	initialize: function(container, options) {
		this.setOptions(options);
		var sliderEl = container.getElements(this.options.sliderClass)[0];
		var knowEl = container.getElements(this.options.knobClass)[0];
		var frontImageWrapperEl = container.getElements(this.options.frontImageWrapperClass)[0];
		var imageContainer = container.getElements(this.options.imgContainerClass)[0];
		
		var initialWidth = imageContainer.getWidth() * this.options.initialPosition / 100;
		var slider = new Slider(sliderEl, knowEl, {
		    range: [0,imageContainer.getWidth()],
		    initialStep: initialWidth,
		    onChange: function(value){
		      //	if (value) $('fontSize').setStyle('font-size', value);
				if(value!==undefined) {
					console.log('width changed to ' + value);
					frontImageWrapperEl.setStyle('width', value+'px');
				}
		    }
		});
	}
})

md.widget.ImageSliderWidget = new Class({
	Implements: [Options,Events],
	options: {
		knobClass:'.md-knob',
		sliderClass:'.md-slider',
		imgContainerClass:'.img-container'
	},
	initialize: function(container, images, options){
		this.setOptions(options);
		var picSlider = new md.widget.PictureSlider(container.getElements(this.options.imgContainerClass)[0], images);	
		
		var sliderEl = container.getElements(this.options.sliderClass)[0];
		var knowEl = container.getElements(this.options.knobClass)[0];
		var slider2 = new Slider(sliderEl, knowEl, {
		    range: [0, 4],
		    initialStep: 0,
		    onChange: function(value){
		      //	if (value) $('fontSize').setStyle('font-size', value);
				if(value != undefined) {
					picSlider.switchTo(value);
				}
		    }
		});
	}
})

/*
---
script: metrodigi-transform.js

description: Provides different custom HTML templating classes

requires: [Core/Core]

provides: [md.HtmlTransformer, md.HtmlTransformerEx, md.ModalContent, md.TemplateContent]

...
*/
var md = md || {};

/**
 	Base class which handles the content to content element transformation
 */
md.HtmlTransformer = new Class({
	Implements:[Options,Events],
	
	options: {
		// default clones the element before copy
	 	copy: true,
	
		// default strip BR tag from destination element during copy
		stripBR: true
	},
	
	initialize:function(srcEl, dest, mapping, options){
		this.setOptions(options);
		this.srcEl = srcEl;
		this.dest = dest;
		this.mapping = mapping;
		if(this.dest && this.dest.template) {
			this.fetchTemplate();
		}
	},
	
	fetchTemplate:function(){
		// For receiving template using XHR, due to CORS issue this is currently not in use
		// var myRequest = new Request({
		// 		    url: this.dest.template,
		// 		    method: 'get',
		// 		    onSuccess: function(responseText){
		// 				console.log('response received', responseText);
		// 				this.templateEl = Elements.from(responseText);
		// 				this.fireEvent('templateLoaded', {elements: this.templateEl});
		// 		    }.bind(this),
		// 		    onFailure: function(){
		// 				console.log('ERROR, Unable to load template');
		// 		    }
		// 		});
		// 		myRequest.send();
		this.templateEl = this.dest.template.el.clone().getChildren();
		
		this.fireEvent('templateLoaded', {elements: this.templateEl});
	},
	
	transform:function(){
		if(this.templateEl == undefined || this.srcEl == undefined || this.dest == undefined){
			return;
		}
			
		//If template and template is not loaded into templateEl yet.
		if(this.dest.template && this.templateEl === undefined) {
				var eventHandle = this.addEvent('templateLoaded', function(){
					this._transform();
					console.log('remove handle here', eventHandle);
				}.bind(this));
		} else {
			this._transform();
		}
	},
	
	_transform:function(){
		if(this.dest.template) {
			// Clear the destination element and copy the template to create basic structure
			this.dest.destinationEl.empty();
			this.dest.destinationEl.adopt(this.templateEl);
		}
		
		// Based on source-to-destination mapping, copy elements
		Object.each(this.mapping, function(destSelector, srcSelector) {
			this._replaceBlock(destSelector, srcSelector);
		}.bind(this));
	},
	
	_replaceBlock:function(destSelector, srcSelector){
		
		// creates array of elements to copy
		var srcElChilds = Array.map(this.srcEl.getElement(srcSelector).getChildren(), function(item){
			
			// if copy enabled, clone element
			if(this.options.copy) {
				item = item.clone();
			}
			
			// if BR not required, remove them
			if(this.options.stripBR) {
				
				// if element contains BR, collect and destroy them
				var brs = item.getElements('br');
				brs.destroy();
				
				// if element itself is BR, destroy it 
				if(item.match('br')) {
					item.destroy();
					return undefined;
				}
			}
			
			return item;
		}.bind(this));

		// copy generated elements to destination elemet
		this.dest.destinationEl.getElement(destSelector).adopt(srcElChilds);
	}
});

/**
 	Extension of basic transformation which handles 

  	1) template based transformation
  	2) disable popups in target element
 	3) block level BR tag removal
 */
md.HtmlTransformerEx = new Class({
	Extends : md.HtmlTransformer,
	
	_transform:function(){
		if(this.srcEl == undefined || this.dest == undefined){
			return;
		}
		
		if(this.dest.template) {
			this.dest.destinationEl.empty();
			this.dest.destinationEl.adopt(this.templateEl);
		}
		
		Object.each(this.options.properties, function(prop) {
			var srcBlockEl = this.srcEl.getElement(prop.srcClass).clone();

			// Disable popup trigger from destination element. This is to avoid opening another popup from popup.
			Array.each(srcBlockEl.getElements("a[data-trigger='ShowPopup']"), function(ele){
				var newEl = new Element('span');
				newEl.innerHTML = ele.innerHTML;
				newEl.replaces(ele);
			});
			
			if(prop['stripBR'] !== undefined && prop.stripBR == false){
				// if not to remove BR  
			}else{
				// remove BR
				if(this.options.stripBR || prop['stripBR'] ) {
					var brs = srcBlockEl.getElements('br');
					brs.destroy();
					if(srcBlockEl.match('br')) {
						srcBlockEl.destroy();
					}
				}
			}
			
			// replace destination template placeholder with generated HTML code
			this.dest.destinationEl.innerHTML = this.dest.destinationEl.innerHTML.replace("{{" + prop.placeholder + "}}", srcBlockEl.innerHTML);
		}.bind(this));
	},
});

/**
 	Wrapper for the basic html transformer. 
	It includes a default template and default mapping, so only source and target element is required for most cases.
	
	Example Use:
	
	new md.ModalContent($('source'), $('destination'), {}); 
 */
md.ModalContent = new Class({
	Implements: [Options],
	
	options: {
		// Default template to copy in destination element
		template: '<div><div class="modal-header"></div><div class="modal-body"></div><div class="modal-footer"><a class="close btn primaryb">Close</a></div></div>',
		
		// Default mapping to copy from source element to destination element
		mappings: {
			'.recipe-header':'.modal-header',
			'.recipe-body':'.modal-body'
		}
	},
	
	initialize: function(srcEl, desEl, options){
		this.setOptions(options);
		
		var transformer = new md.HtmlTransformer(srcEl, { 
			destinationEl: desEl, 
			template: {
				el: Elements.from(this.options.template)[0],
			}
		}, this.options.mappings, this.options);

		transformer.transform();
	}
});


/**
 	Wrapper for template based transformation. 
 	Requires source template and mapping for any transformation.
  
 	Example Use:
 
	var properties = [
		{ "srcClass":".recipe-header", "placeholder": "header", "stripBR": true },
		{ "srcClass":".recipe-body", "placeholder": "body" }
	];
	
 	new md.TemplateContent("#template_id", $('source'), $('target'), { 
		properties: properties, 
		stripBR: false // if omitted, will strip all BR by default
	});
 */
md.TemplateContent = new Class({
	Implements: [Options],
	
	options: {
		stripBR: true	// removes the BR tag from the destination copy
	},
	
	initialize: function(templateId, srcEl, desEl, options){
		this.setOptions(options);
		
		var templateEl = $$(templateId);
		if(templateEl == undefined || templateEl.length == 0){
			return;
		}
		
		var transformer = new md.HtmlTransformerEx(srcEl, { 
			destinationEl: desEl, 
			template: {
				el: $$(templateId)[0],
			}
		}, this.options.mappings, this.options);

		transformer.transform();
	}
});

/*
---
script: metrodigi-widgets.js

description: Provides HTML widgets. 
             1> TextSizeWidget- Widget for changing size of Text

requires: 
 - Core/Core
 - Drag.Scroll

provides: [md.widgets.TextSizeWidget, md.widgets.Tabs, md.widgets.Timeline]
...
*/
var md= md || {};
md.widgets = md.widgets || {};
md.widgets.TextSizeWidget = new Class({
	INVALID_TAGS: ['AUDIO', 'VIDEO', 'IMG', 'BR', 'HR'],
	Implements:[Options],
	
	options: {
		target: null,
		defaultSize: 12,
		incrementPerc: 10,
		widgetContainerClass: 'text-zoom-controls', 
		widgetZoomInClass: 'zoom-in',
		widgetZoomOutClass: 'zoom-out',
		widgetZoomResetClass: 'zoom-reset',
		createEl: true
	},
	originalSize: undefined,
	initialize: function(ele, options){
		this.el = ele;
		this.setOptions(options);
		
		this.target = document.body;
		if(this.options.target) {
			this.target = this.options.target;
		};

		if(this.options.createEl) {
			var mainEl = new Element('div', {'class': this.options.widgetContainerClass});
			var zoomInEl = new Element('div', {text: '+', 'class': this.options.widgetZoomInClass + " zoom-action"});
			var zoomOutEl = new Element('div', {text: '-', 'class': this.options.widgetZoomOutClass + " zoom-action"});
			var zoomResetEl = new Element('div', {text: '0', 'class': this.options.widgetZoomResetClass + " zoom-action"});
			var clearEl = new Element('div', {'style': 'clear: both'});
			mainEl.adopt(zoomInEl, zoomOutEl, zoomResetEl, clearEl);
			this.el.empty();
			this.el.adopt(mainEl);
		} else {
			mainEl = this.el.getElements('.'+this.options.widgetContainerClass);
			zoomInEl = this.el.getElements('.'+this.options.widgetZoomInClass);
			zoomOutEl = this.el.getElements('.'+this.options.widgetZoomOutClass);
			zoomResetEl = this.el.getElements('.'+this.options.widgetZoomResetClass);
		}

		zoomInEl.addEvent('click', function(e){
			e.preventDefault();
			this.changeFontSize(this.target, true);
		}.bind(this));
		
		zoomOutEl.addEvent('click', function(e){
			e.preventDefault();
			this.changeFontSize(this.target, false);
		}.bind(this));
		
		zoomResetEl.addEvent('click', function(e){
			e.preventDefault();
			this.resetFontSize(this.target);
		}.bind(this));
	},
	resetFontSize: function(textEl){
		var oriSize = textEl.getAttribute('data-ori-font-size');
		if(oriSize) {
			console.log('Changed to original size: ' + oriSize + ", el:", textEl);
			textEl.setStyle('font-size', oriSize);
		}
		textEl.getChildren().each(function(el) {
			this.resetFontSize(el);
		}.bind(this));
	},
	changeFontSize:function(textEl, increase){
		var isInvalid = this.INVALID_TAGS.contains(textEl.tagName);
		//CALCULATE FOR CHILD
		textEl.getChildren().each(function(el) {
			this.changeFontSize(el, increase);
		}.bind(this))

		if(isInvalid) {
			return;
		}

		var fontSize =  oriSize = textEl.getStyle('font-size');
		//Save original Size
		if(!textEl.hasAttribute('data-ori-font-size')) {
			textEl.setAttribute('data-ori-font-size', fontSize);
		}

		var unit = '%';
		if(fontSize.indexOf('%')>=0) {
			fontSize = fontSize.substr(0, fontSize.length - 1);
		} else {
			//every other unit is 2 char.
			unit = fontSize.substr(fontSize.length - 2, fontSize.length);
			fontSize = fontSize.substr(0, fontSize.length - 2);
		}

		fontSize = parseFloat(fontSize);
		var sizeChangeVal = fontSize*this.options.incrementPerc / 100;
		if(increase) {
			fontSize = fontSize + sizeChangeVal;	
		} else {
			fontSize = fontSize - sizeChangeVal;	
		}
		
		textEl.setStyle('font-size', fontSize + unit);
		console.log('changed size to ' + (fontSize + unit) + " from " + oriSize +  ", el:", textEl);
		
	}
});

md.widgets.Tabs = new Class({
	Implements: Events,
	initialize: function(tabs, contents, opt) {
		this.tabs = tabs;
		this.contents = contents;
		if(!opt) opt = {};
		this.css = opt.selectedClass || 'selected'; 
		this.select(this.tabs[0]);
		tabs.each(function(tab){
			tab.addEvent('click',function(e){
				this.select(tab);
				e.stop();
			}.bind(this));
		}.bind(this));
	},

	select: function(el) {
		this.tabs.removeClass(this.css);
		el.addClass(this.css);
		this.contents.setStyle('display','none');
		var content = this.contents[this.tabs.indexOf(el)];
		content.setStyle('display','block');
		this.fireEvent('change',[content,el]);
	}
});

md.widgets.Timeline = new Class({
	initialize: function(container){
		new Drag.Scroll(container, {
    		axis: {x: true, y: false}    
  		});	
	}
});

md.widgets.ImageMap = new Class({
	Implements: [Events, Options],
	options: {
		defaultZoom: 100,
		defaultX: 0,
		defaultY: 0,
		zoomStep: 10,
		minZoom: 0,
		maxZoom: 250,
		left: 0,
		top: 0,
		wrapperEl: null,
		imageEl: null,
		controlsEl: null,
		imageUrl: null,
		showZoomControls: true,
	},
	currentZoom: null,
	wrapper: null,
	image: null,
	controlsWrapper: null,
	initialize: function(el, options){
		this.el = el;
		this.setOptions(options);
		var needDomSetup = !options.wrapperEl;
		if(needDomSetup) {
			this.setupDom();
		}
		this.wrapper = this.options.wrapperEl;
		this.image = this.options.imageEl;
		this.controlsWrapper = this.options.controlsEl;
		this.addControls();

		if(!needDomSetup) {
			this.attachBehavior();
		}
	},
	attachBehavior: function(){
		this.setZoom(this.options.defaultZoom);
		this._resetDrag();
		this.wrapper.scrollTo(this.options.left, this.options.top);
	},
	setupDom: function() {
		// <div id="map_wrapper">
		// 	<img id="map_image" src="http://placehold.it/1350x1350" style=""></img>
		// </div>
		// <div id="controls-container">
		// </div>
		this.el.empty();
		this.options.wrapperEl = new Element('div', {'class':'imagemap-wrapper'});
		var size = this.el.getSize();
		this.options.wrapperEl.setStyles({
			'position': 'relative', 'overflow':'hidden',
			'width': size.x+"px", 'height':size.y+"px"});
		
		this.options.imageEl = new Element('img', {
			src: this.options.imageUrl
		});
		this.options.imageEl.addEvent('load', function(){
			this.attachBehavior();
			// Reset minzoom if the image and container are both "portrait" orientation.
			// Prevents zoom out to blank areas.  See CHAUC-1060.
			if (this.image.naturalWidth < this.image.naturalHeight && this.el.getSize().x < this.el.getSize().y) {
				this.options.minZoom = this.el.getSize().x / this.image.naturalWidth * this.image.naturalHeight;
			}
		}.bind(this));

		this.options.controlsEl = new Element('div');

		this.options.wrapperEl.adopt(this.options.imageEl);

		var widgetWrapperEl = new Element('div', {'class':'widget-imagemap-wrapper'});
		widgetWrapperEl.adopt(this.options.wrapperEl);
		widgetWrapperEl.adopt(this.options.controlsEl);
		this.el.adopt(widgetWrapperEl);
	},
	addControls: function(){

		var createControl = function(text, isPlus){
			var controlEl = new Element('div', {
				'class': 'map-control',
				'text':text
			});
			controlEl.addEvent('click', function(e){
				e.stop();
				var zoom = this.currentZoom;
				if(isPlus) {
					zoom = zoom + this.options.zoomStep;
				} else {
					zoom = zoom - this.options.zoomStep;
				}
				this.setZoom(zoom);
			}.bind(this));
			return controlEl;
		}.bind(this);

		this.controlsWrapper.addClass('map-controls-container');
		this.controlsWrapper.adopt(createControl('+', true));
		this.controlsWrapper.adopt(createControl('-', false));
		if(!this.options.showZoomControls) {
			this.controlsWrapper.setStyle('display', 'none');
		}
		//this.wrapper.adopt(container);
	},
	_resetZoom: function(){
		var useWidth = this.el.getSize().x < this.el.getSize().y;
		var zoomWidth = this.currentZoom;
		var zoomHeight = this.currentZoom;
		if(useWidth) {
			zoomWidth = zoomHeight * this.image.naturalWidth / this.image.naturalHeight;
		} else {
			zoomHeight = zoomWidth * this.image.naturalHeight / this.image.naturalWidth;
		}
		this.image.setStyle('width', zoomWidth + "px");
		this.image.setStyle('height', zoomHeight + "px");
	},
	setZoom: function(zoomLevel){
		if(zoomLevel > this.options.maxZoom) {
			this.currentZoom = this.options.maxZoom;
		} else if(zoomLevel < this.options.minZoom) {
			this.currentZoom = this.options.minZoom;
		} else {
			this.currentZoom = zoomLevel;
		}
		this._resetZoom();
	},
	_resetDrag: function(){
		if(this.drag) {
			this.drag.drag.detach();
		}
		this.drag = new Drag.Scroll(this.wrapper, {
    		axis: {x: true, y: true}  
  		});
  		window.drag = this.drag;
	}
});



/*
---

script: Array.Extras.js

name: Array.Extras

description: Extends the Array native object to include useful methods to work with arrays.

license: MIT-style license

authors:
  - Christoph Pojer
  - Sebastian Markbåge

requires:
  - Core/Array
  - MooTools.More

provides: [Array.Extras]

...
*/

(function(nil){

Array.implement({

	min: function(){
		return Math.min.apply(null, this);
	},

	max: function(){
		return Math.max.apply(null, this);
	},

	average: function(){
		return this.length ? this.sum() / this.length : 0;
	},

	sum: function(){
		var result = 0, l = this.length;
		if (l){
			while (l--) result += this[l];
		}
		return result;
	},

	unique: function(){
		return [].combine(this);
	},

	shuffle: function(){
		for (var i = this.length; i && --i;){
			var temp = this[i], r = Math.floor(Math.random() * ( i + 1 ));
			this[i] = this[r];
			this[r] = temp;
		}
		return this;
	},

	reduce: function(fn, value){
		for (var i = 0, l = this.length; i < l; i++){
			if (i in this) value = value === nil ? this[i] : fn.call(null, value, this[i], i, this);
		}
		return value;
	},

	reduceRight: function(fn, value){
		var i = this.length;
		while (i--){
			if (i in this) value = value === nil ? this[i] : fn.call(null, value, this[i], i, this);
		}
		return value;
	}

});

})();


/*
---

script: metrodigi-drag.js

description: Provides Drag-drop based Games structure

requires: [mootools.touch, mootools.drag, More/Array.Extras]

provides: [md.dragdrop]

...
*/

var md = md || {};
md.dragdrop= md.dragdrop || {};
/* Simple Class to display and calculate results.*/
md.dragdrop.ResultManager = new Class({
	Implements: [Options, Events],
	//DEFAULT OPTIONS
	options: {
		container:undefined,
		show:false,
		correctCountSelector:'.correct span',
		incorrectCountSelector:'.incorrect span'
	},
	initialize:function(questionCount, options){
		if(typeOf(questionCount)!='number') {
			throw("questionCount must be number. received: " + questionCount);
		}
		this.questionCount = questionCount;
		this._correctCount=0;
		this._incorrectCount=0;
		this.setOptions(options);
	},
	setView:function(selector, value){
		if(this.options.show && this.options.container!=undefined) {
			this.options.container.getElement(selector).set('text',value);
		}
	},
	incrementCorrect:function(){
		this._correctCount++;
		this.setView(this.options.correctCountSelector, this._correctCount);
		if(this._correctCount==this.questionCount) {
			this.fireEvent('allQuestionsCorrect', {correctPercentage: this.getCorrectPercentage()});
		}
	},
	incrementIncorrect:function(){
		this._incorrectCount++;
		this.setView(this.options.incorrectCountSelector, this._incorrectCount);
	},
	getCorrectPercentage:function(){
		var totalTrial = this._correctCount + this._incorrectCount;
		return this.questionCount / totalTrial * 100;
	}
});

md.dragdrop.BaseGame = new Class({
	Implements: [Options,Events],
	//DEFAULT OPTIONS
	options: {
		correctClass:'correct',
		incorrectClass:'incorrect',
		hoverClass:'dragHover',
		finishMsgSelector:".finishMsg",
		errorAudioPath:'../Audio/error.m4a',
		isCorrectCheck: undefined,
		result: {}
	},
	initialize: function (containerEl, options) {
		this.reflowable = document.body.get('data-book-type') === 'RF3' && !(window.parent && window.parent.Lindgren);
		if (this.reflowable) {
			this.refactorDrag();
		}
		if(typeOf(options)=='null' || 
			typeOf(options.draggables)=='null' || typeOf(options.droppables)=='null' || typeOf(options.draggablesContainer)=='null') {
			throw('options.draggables & options.droppables & options.draggablesContainer are compulatory options.');
		}
		this.setOptions(options);
		if(this.options.errorAudioPath !== undefined) {
			this.errorAudio = new Audio(this.options.errorAudioPath);
		}
		this.setupDraggables();
	},
	refactorDrag: function () {
		// Make drag events use client instead of page coordinates.
		Class.refactor(Drag, {
			start: function (e) {
				e.page = e.client;
				this.previous(e);
			},
			drag: function (e) {
				e.page = e.client;
				this.previous(e);
			}
		});
	},
	startDragHandler: function (context) {
		return function (event) {
			var self = context;
			event.stop();
			var draggable = this;
			var coordinates = {
				left: draggable.getLeft(),
				top: draggable.getTop(),
				width: draggable.getComputedStyle('width'),
				height: draggable.getComputedStyle('height')
			};
			var clone = draggable.clone().setStyles(coordinates).setStyles({
		      	opacity: 0.7,
		      	position: 'absolute',
				'z-index': 11000
			}).inject(self.options.draggablesContainer);
			clone.orig = draggable;
			var container = self.options.appContainer || $$('body'),
				dragOptions = {
					container: container,
					droppables: self.options.droppables,
					onDrop: self._onDropHandler.bind(self),
					onEnter: self.onEnterHandler.bind(self),
					onLeave: self.onLeaveHandler.bind(self),
					onCancel: self.onCancelHandler.bind(self)
				};

			if (self.reflowable) {
				dragOptions.onDrag = function (el, e) {
					el.setStyle('top', e.event.pageY);
				};
			}

			var drag = new Drag.Move(clone, dragOptions);
			drag.start(event);
			context.fireEvent('dragStarted', {'draggable': clone});
		};
	},
	setupDraggables:function() {
		this.options.draggables.addEvent('mousedown', this.startDragHandler(this));
		this.options.draggables.addEvent('touchstart', this.startDragHandler(this));
	},
	makeDraggable:function(draggable){
		this.options.draggables.push(draggable);
		draggable.addEvent('mousedown', this.startDragHandler(this));
		draggable.addEvent('touchstart', this.startDragHandler(this));
	},
	removeDraggable:function(draggable) {
		Array.erase(this.options.draggables, draggable);
		draggable.removeEvents('mousedown');
		draggable.removeEvents('touchstart');
	},
	resetDummy:function(dummyDraggable) {
		dummyDraggable.destroy();
	},
	onCancelHandler:function(dragging) {
		this.resetDummy(dragging);
		this.fireEvent('dragEnded', {'draggable': dragging});
	},
	onEnterHandler:function(draggable, droppable){
		droppable.addClass(this.options.hoverClass);
	},
	onLeaveHandler:function(draggable, droppable){
    	droppable.removeClass(this.options.hoverClass);		
	},
	_onDropHandler: function (dummyDraggable, droppable) {
		// Manually calculate the dropped-on droppable if this is a reflowable.
		if (this.reflowable) {
			var abs = Math.abs;

			droppable = this.options.droppables.map(function (drop) {
				// Get sizing information for each droppable and the position of the draggable relative to it.
				var position = Object.merge(drop.getCoordinates(), dummyDraggable.getPosition(drop));

				return {
					x: position.x,
					y: position.y,
					w: position.width,
					h: position.height,
					el: drop
				};
			}).filter(function (pos) {
				// Filter out droppables that are not intersected by the draggable.
				return abs(pos.x) < pos.w && abs(pos.y) < pos.h;
			}).reduce(function (best, cur) {
				// Use the current if we don't have a best choice.
				if (best.el === null) return cur;

				// Determine whether the current is better than the currently selected best.
				return (abs(best.x) + abs(best.y) < abs(cur.x) + abs(cur.y)) ? best : cur;
			}, { el: null }).el;
		}

		this.fireEvent('dragEnded', {'draggable': dummyDraggable, 'droppable':droppable});
		this.onDropHandler(dummyDraggable.orig, droppable);
		this.resetDummy(dummyDraggable);
	},
	onDropHandler:function(dummyDraggable, droppable) {
	}
});

/* Main Game class */
md.dragdrop.MatchingGame = new Class({
	Extends: md.dragdrop.BaseGame,
	initialize: function (containerEl, options) {
		this.parent(containerEl, options);

		// Create the results manager.
		this.resultManager = new md.dragdrop.ResultManager(this.options.draggables.length, this.options.result);

		// Update and show the finish message when all questions are correct.
		this.resultManager.addEvent('allQuestionsCorrect', function(data) {
			$$(this.options.finishMsgSelector).getElement('span').set('text', Math.round(data.correctPercentage) + '%');
			$$(this.options.finishMsgSelector).fade('in');
		}.bind(this));

		// Add our drag event handlers.
		this.addEvents({
			dragStarted: function (event) {
				// Get the original element being dragged.
				var draggable = event.draggable.orig;
				// Save a reference to the current display style.
				draggable.setAttribute('data-origDisplay',draggable.getStyle('display'));
				// Hide the original element.
				draggable.setStyle('display', 'none');
			},
			dragEnded: function (event) {
				// Restore the original display style (probably showing the element.)
				event.draggable.orig.setStyle('display', event.draggable.orig.getAttribute('data-origDisplay'));
			}
		});
	},
	onDropHandler: function (draggable, droppable) {
		// If we have a droppable.
		if (droppable) {
			// Determine whether this drop is correct or not.
			var correct = false;
			if (this.options.isCorrectCheck !== undefined) {
				// If we have a validation function, let it determine whether this is a correct drop.
				correct = this.options.isCorrectCheck(draggable, droppable);
			} else {
				// Otherwise, the drop is correct if the draggable and droppable's data-textId properties match.
				correct = draggable.get('data-textId') != undefined && draggable.get('data-textId') === droppable.get('data-textId');
			}

			// If this was a correct drop
			if (correct) {
				// Get rid of the draggable clone.
				draggable.destroy();

				// Set the draggable and droppable validation classes to the correct state.
				this.options.droppables.removeClass(this.options.incorrectClass);
				droppable.addClass(this.options.correctClass);
				draggable.removeClass(this.options.incorrectClass);

				// Make this droppable no longer droppable.
				this.options.droppables.erase(droppable);

				// Play the correct sound if present.
				if (droppable.getElement('span') !== null && droppable.getElement('span').hasAttribute('data-ibooks-audio-src')) {
					var wordAudio = new Audio(droppable.getElement('span').getAttribute('data-ibooks-audio-src'));
					wordAudio.play();
				}

				// Update the results manager.
				this.resultManager.incrementCorrect();

				// If we have a correct handler, call it.
				if (this.options.correctHandler) {
					this.options.correctHandler(draggable, droppable);
				}
			// If this was an incorrect drop.
			} else {
				// Set draggable and droppable validation classes to the incorrect state.
				draggable.addClass(this.options.incorrectClass);
				droppable.addClass(this.options.incorrectClass);

				// Play the incorrect sound if present.
				if (this.errorAudio) {
					this.errorAudio.play();
				}

				// Update the results manager.
				this.resultManager.incrementIncorrect();

				// Call the incorrect handler if present.
				if (this.options.incorrectHandler) {
					this.options.incorrectHandler(draggable, droppable);
				}
			}

			// Call the Base Game's leave handler.
			this.onLeaveHandler(draggable,droppable);
		}
	}
});

md.dragdrop.CollectionGame = new Class({
	Extends: md.dragdrop.BaseGame,
	initialize: function (containerEl, options) {
		this.parent(containerEl,options);

		// Setup state variables.
		this.dropCount = 0;

		// Add our drag event handlers.
		this.addEvents({
			dragStarted: function (event) {
				event.draggable.addClass('drag');
				event.draggable.orig.addClass('active');
			},
			dragEnded: function (event) {
				event.draggable.orig.removeClass('active');
			}
		});
	},
	onDropHandler: function (draggable, droppable) {
		// If we have a drop taget and have not reached our drop limit.
		if (droppable && this.options.dropLimit > this.dropCount) {
			// Determine whether the drop is correct.
			var correct = false;
			if (this.options.isCorrectCheck !== undefined) {
				// Let the validation function determine if we have one.
				correct = this.options.isCorrectCheck(draggable, droppable);
			} else {
				// Otherwise, the drop is correct if the draggable and droppable's data-textId properties match.
				correct = draggable.get('data-textId') !== undefined && draggable.get('data-textId') === droppable.get('data-textId');
			}

			// If the drop is correct.
			if (correct) {
				// Call the correct handler if we have one.
				if (this.options.correctHandler) {
					var boundCorrectHandler = this.options.correctHandler.bind(this);
					boundCorrectHandler(draggable, droppable);
				}

				// Update the drop count.
				this.dropCount++;
			}

			// Call the Base Game's leave handler.
			this.onLeaveHandler(draggable,droppable);
		// Otherwise, if we have reached the drop limit.
		} else if (this.options.dropLimit <= this.dropCount) {
			window.alert('House is full (' + this.dropCount + ' members). Time for somebody to sleep outside.');
		}
	}
});

md.dragdrop.Quiz = new Class({
	Implements: [Options],
	options: {
		reverse: false,
		minHeight: '100px',
		score: false,
		instructions: 'Drag the answers in the right column to the corresponding items on the left.'
	},
	initialize: function (el, questionSet, options) {
		this.el = el;

		// Setup state variables.
		var questions = [];
		var answers = [];
		this.questionMapping = {};
		this.reflowable = document.body.get('data-book-type') === 'RF3' && !(window.parent && window.parent.Lindgren);

		// Merge the options.
		this.setOptions(options);

		// Prepare the questions.
		questionSet.each(function (question) {
			// Switch question and answer if the reverse option is set.
			if (this.options.reverse) {
				var q = question.answer;
				var a = question.question;
			} else {
				var q = question.question;
				var a = question.answer;
			}

			// Add the questions and answers to our state variables.
			questions.push(q);
			answers.push(a);
			this.questionMapping[q] = a;
		}.bind(this));

		// If we have duplicate questions, show error
		if (questions.length !== questions.unique().length) {
			throw('Questions has duplicate question, There should not be any duplicate questions');
		}

		// Save the prepared questions.
		this.questions = questions;

		// Shuffle and save the prepared answers.
		this.answers = answers.shuffle();

		// Create the UI.
		this.createDOM();

		// Add the drag interaction.
		this.makeDrag();
		if (this.options.score) {
			this.incorrectAnswers = 0;
			this.correctAnswers = 0;
		}
	},
	makeDrag: function () {
		var matchingGameOptions = {
			draggables: this.el.getElements('.draggable'),
			droppables: this.el.getElements('.droppable'),
			draggablesContainer: this.reflowable ? this.el.getElement('.draggable-container') : $$('body')[0],
			correctHandler: function (draggable, droppable) {
				// Have the droppable accept the draggable.
				droppable.adopt(draggable.clone());
				// Cleanup the temporary draggable.
				draggable.destroy();

				if (this.options.score) {
					this.correctAnswers += 1;
					this.el.getElement('.dragdropquiz-correct-score').set('text', this.correctAnswers);
				}
			}.bind(this),
			incorrectHandler: function () {
				if (this.options.score) {
					this.incorrectAnswers += 1;
					this.el.getElement('.dragdropquiz-incorrect-score').set('text', this.incorrectAnswers);
				}
			}.bind(this)
		};

		if (this.reflowable) {
			matchingGameOptions.appContainer = this.el.getElement('.dragdropquiz-container');
		}

		// Create a Matching Game to handle the drag and drop interaction.
		new md.dragdrop.MatchingGame(this.el, matchingGameOptions);
	},
	reset: function () {
		// Reset the UI.
		this.createDOM();

		// Recreate the drag interaction.
		this.makeDrag();
		if (this.options.score) {
			this.incorrectAnswers = 0;
			this.correctAnswers = 0;
		}
	},
	createDOM: function() {
		var widgetContainer = new Element('div', {'class': 'dragdropquiz-container'}),
			instructions = new Element('div', { 'class': 'dragdropquiz-instructions', text: this.options.instructions }),
			resetButtonWrapper = new Element('div', {'class': 'dragdropquiz-reset-wrapper'}),
			resetButton = new Element('button', { 'class': 'dragdropquiz-reset', text: 'Reset', events: { click: this.reset.bind(this) } });

		widgetContainer.adopt(instructions);

		if (this.options.score) {
			var scoreContainer = new Element('div', { 'class': 'dragdropquiz-score' }),
				correctContainer = new Element('div', { html: '<span class="correct-label">Correct</span>' }),
				correctScore = new Element('div', { 'class': 'dragdropquiz-correct-score', text: '0' }),
				incorrectContainer = new Element('div', { html: '<span class="incorrect-label">Incorrect</span>' }),
				incorrectScore = new Element('div', { 'class': 'dragdropquiz-incorrect-score', text: '0' });

			widgetContainer.adopt(scoreContainer.adopt(correctContainer.adopt(correctScore), incorrectContainer.adopt(incorrectScore)));
		}


		var questionContainer = new Element('div', {'class': 'draggable-container', styles: { 'min-height': this.options.minHeight }});
		this.questions.each(function(question){
			var questionWrapper = new Element("div", {"class":"question-wrapper"});
			questionWrapper.adopt(new Element('div', {
				'class': 'draggable question chaucer smartwidget',
				'data-textId': this.questionMapping[question],
				'text': question
			}));

			questionContainer.adopt(questionWrapper);
		}.bind(this));

		var answerContainer = new Element('div', {'class': 'droppable-container'});
		this.answers.each(function(answer){
			var answerText = new Element('div', {text: answer});
			var answerHolder = new Element('div', {
				'class': 'droppable',
				'data-textId': answer
			});
			var answerEl = new Element('div', {	'class': 'answer' });
			answerEl.adopt([answerText, answerHolder]);
			answerContainer.adopt(answerEl);
		}.bind(this));

		resetButtonWrapper.adopt(resetButton);
		widgetContainer.adopt(answerContainer, questionContainer, resetButtonWrapper.adopt(resetButton));

		this.el.empty();
		this.el.adopt(widgetContainer);

		// If we are in a reflowable.
		if (this.reflowable) {
			// Make the container position relative.
			widgetContainer.setStyle('position', 'relative');
			// Add a page break class to the parent.
			this.el.getParent().addClass('page-break');
		}
	}
});


/*
---
script: metrodigi-notes.js

description: Provides notes popdown functionality on bible

requires: [mootools.touch, mootools.drag]

provides: [md.BibleNotes]

...
*/

var md = md || {};
md.BibleNotes = new Class({
	Implements: [Options],
	
	options: {
		startsWith: "c",
		separator: "_",
		useParent: true,
		wrapWithDiv: true
	},
	
	initialize: function(notes, options){
		this.setOptions(options);
		
		Array.each(notes, function(note){

			if(note.starting.chapter > note.ending.chapter){
				if(console.error){
					console.error("starting chapter can not be greater than ending chapter", note);
				}
				return;
			}
			
			var startNodeId = this.options.startsWith + note.starting.chapter + this.options.separator + note.starting.verse;
			var startNode = $(startNodeId);
			var startNodeParent;
			
			var endNodeId = this.options.startsWith + note.ending.chapter + this.options.separator + note.ending.verse;
			var endNode = $(endNodeId);
			var endNodeParent;
		
			if(startNode == null || startNode == undefined || endNode == null || endNode == undefined){
				console.error ? console.error("start or end node not available, start=", startNode, ", end=", endNode) : console.log("start or end node not available", "start=", startNode, ", end=", endNode);
				return;
			}
			
			if(this.options.useParent){
				endNodeParent = endNode.parentNode;
				startNodeParent = startNode.parentNode;
			}
		
			var notesLink = new Element("a", {
				href: 'javascript:',
				html: note.linkText
			});
			//notesLink.injectAfter(endNode);
			endNodeParent.appendChild(notesLink);
			
			var wrapper;
			
			var toolTip = new Element("div", {'class': "tooltip"});
			
			var toolTipClose = new Element("div", {'class': "close", title: "Close"});
			toolTipClose.injectBottom(toolTip);
			
			var title = new Element("span", {'class': "title"}).injectBottom(toolTip);
			title.innerHTML = note.title;
			
			var content = new Element("div", {'class': "content"}).injectBottom(toolTip);
			content.innerHTML = note.contents;

			notesLink.addEvent("click", function(e){
				e.stop();
				toolTip.show();
				if(wrapper){
					wrapper.addClass("active");
				}
			});
			
			toolTipClose.addEvent("click", function(e){
				e.stop();
				toolTip.hide();
				
				if(wrapper){
					wrapper.removeClass("active");
				}
			});
			
			//pa.previousElementSibling;
			if(this.options.wrapWithDiv){
				var preNode = startNodeParent.previousElementSibling;
				wrapper = new Element("div", {'class': "wrapper"});
				
				if(preNode.id == "c" + note.starting.chapter){
					wrapper.injectBefore(preNode);					
				}else{
					wrapper.injectBefore(startNodeParent);
				}
				
				
				for(chapter= note.starting.chapter; chapter<= note.ending.chapter; chapter++){
					var startVerse = note.starting.verse, endVerse = 0;
					if(chapter != note.ending.chapter){
						endVerse = 999;
					}else{
						endVerse = note.ending.verse;
					}
					
					for(verse = startVerse; verse <= endVerse; verse++){
						var nodeId = this.options.startsWith + chapter + this.options.separator + verse;
						var node = $(nodeId);
						var nodeParent;

						if(node != null && node != undefined){
							if(this.options.useParent){
								nodeParent = node.parentNode;
							}
							
							var prev = nodeParent.previousElementSibling;
							if(verse == 1){
								if(prev != wrapper) {
									prev.injectBottom(wrapper);
								}
							}else{
								var tag = prev.tagName.toLowerCase();
								if(tag != "div" && tag != "p"){
									prev.injectBottom(wrapper);
								}
							}
							nodeParent.injectBottom(wrapper);
						}
					}
				}
				
				toolTip.injectBottom(wrapper);
			}else{
				toolTip.injectAfter(endNodeParent);
			}
		}.bind(this));
	}
});

/*
---
script: metrodigi-flash.js

description: Allows user to show/manage flash message 

requires: 
	- Core/DomReady
	- Core/Element.Event
  
provides: [md.util.Flash]
...
*/
var md = md || {};
md.util = md.util || {};

md.util.Flash = new Class({
	Implements: [Options, Events],
	//DEFAULT OPTIONS
	options: {
		containerSelector:'body', //Will use first element
		type:'info', // One of 'error', 'success', 'info', 'warning'
		time: 5000,
		position: 'top' // One of 'top', 'center', 'bottom',
		// width: 'auto'
	},
	initialize:function(options){
		this.setOptions(options);
	}, 
	show: function(msg, type){
		if(!type) {
			type= this.options.type;
		}
		if (this.flashDiv) this.destroy();
		
		this.flashDiv = new Element('div', {
			'class': 'alert-message flash'
			,'styles': { 'width':this.options.width }
		}).inject($$(this.options.containerSelector)[0]);
		
		this.flashDiv.addClass(type);
		this.flashDiv.show().innerHTML += '<p>' +  msg + '</p>';
		
		if(this.options.position == 'center') {
			this._center(this.flashDiv);
		}
		clearTimeout(this.flashTimer);
		this.flashTimer = this.destroy.bind(this).delay(this.options.time);
	},
	_center: function(div) {
		// div.setStyles({
		//   'left': '50%',
		//   'top': '50%',
		//   'position':'absolute',
		//   'margin-left': - div.getComputedSize().width/2,
		//   'margin-top': - div.getComputedSize().height/2
		// });
	},
	destroy: function(){
		if(this.flashDiv) {
			this.flashDiv.destroy();
    		this.flashDiv = null;
		}
	}
})

/*
---
script: metrodigi-storage.js

description: Allows storing data into Local or Session storage

requires: 
	- Core/DomReady
	- Core/Element.Event
  
provides: [md.storage]
...
*/
var md = md || {};
md.storage = md.storage || {};
md.storage.MemoryStorage = new Class({
	data: null,
	initialize: function(){
		this.data = {};
	},
	setItem: function(key, value){
		this.data[key] = value;
	},
	getItem: function(key){
		return this.data[key];
	}
});

md.storage.Local = new Class({
	Implements: [Options, Events],
	//DEFAULT OPTIONS
	options: {
		//DEPERECATED
		session:false,
		storage: null //Either memory, session, local
	},
	MAP: {
		memory: new md.storage.MemoryStorage(),
		session: window.sessionStorage,
		local: window.localStorage
	},
	initialize:function(name, options){
		if($type(name) != "string") {
			throw('name must be string, found: ' + key);
		}
		this.name = name;
		this.setOptions(options);
		if(this.options.storage) {
			this.storage = this.MAP[this.options.storage];
		} else {
			//DEPRECATED SUPPORT
			if(this.options.session) {
				this.storage = window.sessionStorage;
			} else {
				this.storage = window.localStorage;
			}
		}
	},
	save:function(key, value) {
		var obj = this._get();
		obj[key] = value;
		this._persist(obj);
	},
	remove: function(key) {
		var obj = this._get();
		delete obj[key];
		this._persist(obj);
	},
	get: function(key) {
		var obj = this._get();
		if(obj==undefined || obj == null) { obj = {}; }
		return obj[key];
	},
	has: function(key) {
		var val = this.get(key);
		return !(val==null || val ==undefined);
	},
	getAll: function(){
		return this._get();
	},
	clear: function(){
		this._persist({});
	},
	_get: function(){
		var item = this.storage.getItem(this.name)
		if(!item) {
			return {};
		}
		var resp = JSON.parse(item);
		return resp || {};
	},
	_persist: function(obj) {
		this.storage.setItem(this.name, JSON.stringify(obj));
	}
})

/*
---
script: metrodigi-quiz.js

description: Allows local storage supported Quiz module

requires: 
	- Core/DomReady
	- Core/Element.Event
	- md.storage
  
provides: [md.quiz]
...
*/
var md = md || {};
md.widgets = md.widgets || {};

md.widgets.Quiz = new Class({
	CHAR_MAP: 'abcdefghijklmnopqrstuvwxyz0123456789',
	Implements: [Options, Events],
	//DEFAULT OPTIONS
	options: {
		container:undefined,
		qAttr:'data-que',
		optAttr: 'data-option',
		qSetAttr:'data-que-set',
		answerAttr: 'data-answer',
		correctMsgAttr: 'data-que-correct-text',
		incorrectMsgAttr: 'data-que-incorrect-text',
		correctClass: 'correctAnswer',
		incorrectClass: 'incorrectAnswer',
		selectedClass: 'selectedAnswer',
		multiAnswer: 'data-multi-answer',
		totalQuestions: -1,
		persist: true,
		generateHTML: false,
		questionData: null,
		msgTimeout: 5000,
		inlineMsg: true,
		minHeight: '300px',
		correctMsg: 'Correct! You answered correctly. Good job.',
		incorrectMsg: 'Sorry! That is not the correct answer.'
	},
	initialize:function(el, options){
		options.correctMsg = options.questionData.correctMsg;
		options.incorrectMsg = options.questionData.incorrectMsg;
		this.saveHtml = "";
		this.setOptions(options);
		this.el = $(el);
		if(this.options.generateHTML) {
			this.generateHTML(this.options.questionData);
		}

		this.flash = new md.util.Flash({position:"center", type:"info", time: this.options.msgTimeout});
		this.stores = {};
		this.quizSummaries = {};
		var questions = this.options.container.getElements('['+this.options.qAttr+']');
		this.totalCount = questions.length;
		if(this.options.totalQuestions<=0) { 
			this.options.totalQuestions = this.totalCount;
		}
		questions.each(function(questionEl) {
			this._setupQuestion(questionEl);
		}.bind(this));
	},
	showMessage: function(isSuccess, questionEl, msg){
		var msg = isSuccess ? this.options.correctMsg : this.options.incorrectMsg;
		if(this.options.inlineMsg) {
			var quizElParent = questionEl;
			//REmove if already has
			if(quizElParent.getElements('.inline-message')) {
				quizElParent.getElements('.inline-message').destroy();
			}
			var cls = isSuccess?'quiz-correct':'quiz-incorrect';
			var msgEl = new Element("span", {'class':"inline-message epub__inline-message " + cls + " epub__"+cls});
			msgEl.set('text', msg);
			quizElParent.adopt(msgEl);
			setTimeout(function(){msgEl.destroy()}, this.options.msgTimeout);
		} else {
			if(isSuccess) {
				//flash.success(msg, 10);
				this.flash.show(msg);
			} else {
				this.flash.show(msg, 'error');
			}
		}
	},
	generateHTML: function(questionData){ 
		var self = this;
		this.el.empty();
		var quizWrapperEl = new Element('div', {'class':'quiz-wrapper', styles: { 'min-height': this.options.minHeight } });
		var addOption = function(option, i, optContainer){
			var optEl = new Element('div', {
				'html': '<span class="order">'+self.CHAR_MAP.charAt(option.order-1)+'</span> ' + option.text,
				'class':'answer question-option'
			});
			optEl.setAttribute(self.options.optAttr, option.order);

			if(option.correct) {
				optEl.setAttribute(self.options.answerAttr, 'true');
			}
			optContainer.adopt(optEl);
		};
		var addQuestion = function(question, i){
			var qEl = new Element('div', {
				'class':'question-wrapper'
			});
			qEl.setAttribute(self.options.mulitAnswer, true);
			qEl.setAttribute(self.options.qSetAttr, self.el.getAttribute('id')||'1');
			qEl.setAttribute(self.options.qAttr, i+"");

			qEl.setAttribute(self.options.correctMsgAttr, questionData.correctMsg);
			qEl.setAttribute(self.options.incorrectMsgAttr, questionData.incorrectMsg);

			var textEl = new Element('div', {
				html: '<span class="order">'+question.order+'</span> ' + question.text,
				'class': 'question'
			});
			qEl.adopt(textEl);

			var optContainerEl = new Element('div', {
				'class': 'answerset options-wrapper'
			});
			var i = 0;
			question.options.each(function(option) {
				i++;
				addOption(option, i, optContainerEl)
			});
			//Add options El to Question El.
			qEl.adopt(optContainerEl);
 
			//Put Question into Quiz
			quizWrapperEl.adopt(qEl);
		};
		
		var i=0;
		questionData.questions.each(function(question){
			i++;
			addQuestion(question, i);
		});

		var resetBtn = new Element('button', {text: 'Reset', 'class': 'reset'});
 
		resetBtn.addEvent('click', function () {
			var reset = function (resetClass) { 

				(resetClass === '.inline-message')
				? this.el.getElements(resetClass).forEach( function (el) {
					el.destroy();
				  })
				: this.el.getElements(resetClass).forEach( function (el) {
					el.removeClass(resetClass.substr(1));
				  });
			}.bind(this)

			reset('.correctAnswer');
			reset('.incorrectAnswer');
			reset('.inline-message');
		}.bind(this));

		quizWrapperEl.adopt(resetBtn);
  
		//Put Quiz in EL
		this.el.adopt(quizWrapperEl);
		//this.options.correctMsg = questionData.correctMsg;
		//this.options.incorrectMsg = questionData.incorrectMsg;
		this.options.container = this.el;
	},
	isAnswered: function(store, qId){
		return store.has(qId) && store.get(qId).answered;
	},
	_setupQuestion: function(questionEl) {
		var qSet = questionEl.getAttribute(this.options.qSetAttr);
		var qId = questionEl.getAttribute(this.options.qAttr);
		var isMultiAnswer = questionEl.getAttribute(this.options.multiAnswer) || false;
		
		var optionsEl = questionEl.getElements('['+this.options.optAttr+']');
		optionsEl.each(function(optionEl) {
			this._setupOption(questionEl, optionEl, qSet, qId, isMultiAnswer);
		}.bind(this));
	},
	_setupOption: function(questionEl, optionEl, qSet, qId, isMultiAnswer) {
		var optionId = optionEl.getAttribute(this.options.optAttr);

		var store = this.stores[qSet];
		var quizSummary = this.quizSummaries[qSet];
		if(!store) {
			var storage = this.options.persist?"local":"memory";
			store = new md.storage.Local(qSet+"-store", { storage: storage });
			quizSummary = new md.widgets.QuizSummary(qSet, store, this.options.totalQuestions);
			this.stores[qSet] = store;
			this.quizSummaries[qSet] = quizSummary;
		}

		if(!this.isAnswered(store, qId)) {
			optionEl.addEvent('click', function(e){ 
				e.preventDefault();

				e.target.getParent('.options-wrapper').getChildren().forEach( function (el) {
					el.removeClass('correctAnswer').removeClass('incorrectAnswer');
				});

				//IF ALREADY ANSWERED
				//if(this.isAnswered(store, qId)) { return; } //<------------------------
				var isCorrect = optionEl.hasAttribute('data-answer');
				if(isMultiAnswer) {
					this._handleMultiAnswerClick(store, optionEl, qId, optionId)
				} else {
					store.save(qId+"", {'answered': true, 'correct': isCorrect, 'optionId': optionId, 'multiAnswer': isMultiAnswer});
				}
				var answer = store.get(qId);
				this._setEl(optionEl, answer);
				this._showMsg(answer, questionEl, quizSummary);
			}.bind(this));
			
			//SETUP Half ticked Answers UI
			if(isMultiAnswer && store.has(qId)) {
				var ans = store.get(qId);
				if(ans.optionIds.contains(optionId)) {
					this._setEl(optionEl, ans);
				}
			}
		} else {
			console.log('already answered');
			var ans  = store.get(qId);
			if(ans.multiAnswer) {
				if(ans.optionIds.contains(optionId)) {
					this._setEl(optionEl, ans);
				}
			} else {
				if(optionId == ans.optionId) {
					this._setEl(optionEl, ans);
				}
			}
		}
	},
	_handleMultiAnswerClick: function(store, optionEl, qId, optionId){
		if(!store.has(qId)) {
			store.save(qId,
			 {'answered': false, 'correct': false, 'optionIds': [], 'multiAnswer': true});
		}
		
		var ans = store.get(qId);
		//If already selected
		if(ans.optionIds.contains(optionId)) {
			return;
		}
		ans.optionIds.push(optionId);
		ans.correct = this._isMultiAnswerCorrect(ans, qId);
		store.save(qId, ans);
		//Mark Answer as saved if required are ticked.
		if(this._isMultiAnswered(store, optionEl, qId)) {
			this._setMultiAnswerEl(ans, qId);
			var ans = store.get(qId);
			ans['answered']=true;
			store.save(qId, ans);
		}
	},
	_isMultiAnswerCorrect: function(answer, qId) {
		var answersEl = this.options.container.getElements('['+this.options.qAttr+'='+ qId +'] ['+this.options.answerAttr+'=true]');
		var optionIds = answersEl.map(function(answer) {
		 	return answer.getAttribute(this.options.optAttr);
		}.bind(this));
		return optionIds.every(function(optionId) {
			return answer.optionIds.contains(optionId);
		})
	},
	_isMultiAnswered: function(store, optionEl, qId) {
		var answersEl = this.options.container.getElements('['+this.options.qAttr+'='+ qId +'] ['+this.options.answerAttr+'=true]');		
		var ans = store.get(qId);
		return ans.optionIds.length == answersEl.length;
	},
	_showMsg: function(answer, questionEl, quizSummary) {
		//return is answer is not complete
		if(!answer.answered) {
			return;
		}

		var attr = this.options.incorrectMsgAttr;
		if(answer.correct) {
			attr = this.options.correctMsgAttr;
		}
		
		if(questionEl.hasAttribute(attr)) {
			//if(answer.correct) {
				this.showMessage(answer.correct, questionEl, questionEl.getAttribute(attr));
				//this.flash.show(questionEl.getAttribute(attr));
			//} else {
				//this.flash.show(questionEl.getAttribute(attr), "error");
			//}
		} else {
			var msg = null;
			if(answer.correct) {
				msg = "You have " + quizSummary.getCorrectQCount() + " correct answer. Remaining: " + quizSummary.getRemainingQCount();
			} else {
				msg = 'You have ' + quizSummary.getIncorrectQCount() + ' incorrect answer' +
				 (quizSummary.getIncorrectQCount() > 1 ? 's' : '') + '. Remaining: ' + quizSummary.getRemainingQCount();				
			}
			this.showMessage(answer.correct, questionEl, msg);
		}
	},
	_setEl: function(el, ans) {
		if(ans.multiAnswer && !ans.answered) {
			el.addClass(this.options.selectedClass);
		} else if(ans.answered) {
			if(ans.correct){
				this.correctCount++;
			} else {
				this.incorrectCount++;
			}
			this._setOptionColor(el, ans.correct);
		}
	},
	_setMultiAnswerEl: function(answer, qId) {
		var answersEl = this.options.container.getElements('['+this.options.qAttr+'='+ qId +'] [class='+this.options.selectedClass+']');
		answersEl.each(function(answerEl) {
			answerEl.removeClass(this.options.selectedClass);
			this._setOptionColor(answerEl, answer.correct);
		}.bind(this));
	},
	_setOptionColor: function(el, isCorrect) {
		var clasName = isCorrect?this.options.correctClass:this.options.incorrectClass;
		el.addClass(clasName);
	}
	
});

md.widgets.QuizSummary = new Class({
	initialize: function(qSet, quizStore, totalQuestions){
		this.quizStore = quizStore;
		this.totalQuestions = totalQuestions;
		this.store = new md.storage.Local(qSet +"-summary", { session: true });
		this.store.save('totalQuestions', this.totalQuestions);
	},
	getTotalQCount: function(){
		return parseInt(this.store.get('totalQuestions'));
	},
	getCorrectQCount: function(){
		return this._processAndCount(function(q) {
			return q.answered && q.correct
		});
	},
	getIncorrectQCount: function(){
		return this._processAndCount(function(q) {
			return q.answered && !q.correct
		});
	},
	getAnsweredQCount: function(){
		return this._processAndCount(function(q) {
			return q.answered;
		})
	},
	getRemainingQCount: function(){
		return this.getTotalQCount() - this.getAnsweredQCount();
	},
	_processAndCount: function(validateMethod){
		var count = 0;
		Object.each(this.quizStore.getAll(), function(q){
			if(validateMethod(q)) {
				count++;
			}
		});
		return count;		
	}
});

/*
---
script: metrodigi-share.js

description: Provides Share widgets. 

requires: [Core/Core]

provides: [md.widgets.ShareWidget]
...
*/

var md= md || {};
md.widgets = md.widgets || {};
md.widgets.ShareWidget = new Class({
	Implements:[Options],
	URL_MAP: {
		'facebook': 'http://www.facebook.com/sharer/sharer.php?u=#url',
		'twitter': 'https://twitter.com/intent/tweet?text=#url',
		'google': 'https://plus.google.com/share?url=#url'
	},
	options: {
		services: ['facebook', 'google', 'twitter']
	},
	
	//"new md.widgets.ShareWidget($('51240a0c0e50b'), 'http://www.metrodigi.com', { services: ["facebook","google","twitter"] })"
	initialize: function(ele, url, options){
		ele.empty();
		this.setOptions(options);
		this.el = new Element('div', {
			'class':"share-widget"
		});

		this.options.services.each(function(service){
			//create share URL		
			var finalUrl = this.URL_MAP[service].replace('#url', url);
			var serviceEl = new Element('a', {
				//text: service.capitalize(),
				target: '_blank',
				href: finalUrl
			});
			var liEl = new Element('li', {'class': 'service-'+service});
			liEl.adopt(serviceEl);
			this.el.adopt(liEl);

		}.bind(this));
		this.el.adopt(new Element('span', {style: 'clear: both'}));
		//Inject in given Element
		ele.adopt(this);
	},
	toElement: function(){
		return this.el;
	}
});

/*
---
script: metrodigi-gallery.js

description: Allows storing data into Local or Session storage

requires: 
	- Core/DomReady
	- Core/Class
	- Core/Fx.Tween
	- Core/Slick.Parser

provides: [md.widgets.Gallery]
...
*/
;(function(){
var Loop = new Class({

	loopCount: 0,
	isLooping: false,
	loopMethod: function(){},

	setLoop: function(fn, delay){
		wasLooping = this.isLooping;
		if (wasLooping) this.stopLoop();
		this.loopMethod = fn;
		this.loopDelay = delay || 3000;
		if (wasLooping) this.startLoop();
		return this;
	},

	stopLoop: function(){
		this.isLooping = false;
		clearInterval(this.periodical);
		return this;
	},

	startLoop: function(delay, now){
		if (!this.isLooping){
			this.isLooping = true;
			if (now) this.looper();
			this.periodical = this.looper.periodical(delay || this.loopDelay, this);
		};
		return this;
	},

	resetLoop: function(){
		this.loopCount = 0;
		return this;
	},

	looper: function(){
		this.loopCount++;
		this.loopMethod(this.loopCount);
		return this;
	}

});

var Gallery = this.Gallery = new Class({

	Implements: [Options, Events, Loop],

	options: {
		/*
		onShow: function(){},
		onShowComplete: function(){},
		onReverse: function(){},
		onPlay: function(){},
		onPause: function(){},
		*/
		delay: 7000,
		transition: 'crossFade',
		duration: 500,
		autoplay: false,
		dataAttribute: 'data-gallery',
		selector: '> *',
		initialSlideIndex: 0
	},

	transitioning: false,
	reversed: false,

	initialize: function(element, options, noSetup){
		this.element = document.id(element);
		this.setOptions(options);
		if (!noSetup) this.setup();
	},

	setup: function(options){
		if (options) this.setOptions(options);
		this.slides = this.element.getElements(this.options.selector);
		this.setupElement().setupSlides();
		this.current = this.current || this.slides[this.options.initialSlideIndex];
		this.index = this.current.retrieve('gallery-index');
		this.setLoop(this.show.pass(this.reversed ? 'previous' : 'next', this), this.options.delay);
		if (this.options.autoplay) this.play();
		return this;
	},

	show: function(slide, options){
		if (slide == 'next' || slide == 'previous') slide = this[slide + 'Slide']();
		if (typeof slide == 'number') slide = this.slides[slide];
		if (slide == this.current || this.transitioning) return this;

		this.transitioning = true;
		this.current.store('gallery:oldStyles', this.current.get('style'));

		var transition = (options && options.transition) ? options.transition : slide.retrieve('gallery-transition'),
			duration = (options && options.duration) ? options.duration : slide.retrieve('gallery-duration'),
			previous = this.current.setStyle('z-index', 1),
			next = this.reset(slide).setStyle('z-index', 0),
			nextIndex = this.index = next.retrieve('gallery-index')
			slideData = {
				previous: { element: previous, index: previous.retrieve('gallery-index') },
				next:     { element: next,     index: nextIndex }
			};

		this.fireEvent('show', slideData);

		Gallery.transitions[transition]({
			previous: previous,
			next: next,
			duration: duration,
			instance: this
		});

		previous.setStyle('width', 0);
		(function(){
			previous.setStyle('visibility', 'hidden');
			this.fireEvent('showComplete', slideData);
			this.transitioning = false;
		}).bind(this).delay(duration);

		this.current = next;
		return this;
	},

	play: function(){
		this.startLoop();
		this.fireEvent('play');
		return this;
	},

	pause: function(){
		this.stopLoop();
		this.fireEvent('pause');
		return this;
	},

	reverse: function(){
		this.setLoop(this.show.pass(this.reversed ? 'next' : 'previous', this), this.options.delay);
		this.reversed = !this.reversed;
		this.fireEvent('reverse');
		return this;
	},

	setupElement: function(){
		this.storeData(this.element);
		this.options.duration = this.element.retrieve('gallery-duration');
		this.options.transition = this.element.retrieve('gallery-transition');
		this.options.delay = this.element.retrieve('gallery-delay');
		if (this.element.getStyle('position') == 'static') this.element.setStyle('position', 'relative');
		return this;
	},

	setupSlides: function(){
		this.slides.each(function(slide, index){
			slide.store('gallery-index', index).store('gallery:oldStyles', slide.get('style'));
			this.storeData(slide);
			slide.setStyle('visibility', (this.current || index == this.options.initialSlideIndex) ? '' : 'hidden');
			if (!this.current && index !== this.options.initialSlideIndex) {
				slide.setStyle('width', 0);
			}
		}, this);
		return this;
	},

	storeData: function(element){
		var ops = this.options;
		// default options
		element.store('gallery-transition', ops.transition);
		element.store('gallery-duration', ops.duration);
		if (element == this.element) element.store('gallery-delay', ops.delay);
		// override from data attribute
		var data = element.get(this.options.dataAttribute);
		if (!data) return this;
		Slick.parse(data).expressions[0].each(function(option){
			element.store('gallery-' + option.tag, option.pseudos[0].key);
		});
		return this;
	},

	reset: function(slide){
		return slide.set('style', slide.retrieve('gallery:oldStyles'));
	},

	nextSlide: function(){
		return this.slides[this.index + 1] || this.slides[0];
	},

	previousSlide: function(){
		return this.slides[this.index - 1] || this.slides.getLast();
	},

	toElement: function(){
		return this.element;
	}

});

Gallery.transitions = {};

Gallery.defineTransition = function(name, fn){
	Gallery.transitions[name] = fn;
};

Gallery.defineTransitions = function(transitions){
	Object.each(transitions, function(item, index){
		Gallery.defineTransition(index, item);
	});
};

})();

// element extensions

Element.Properties.gallery = {

	set: function(options){
		this.get('gallery').setup(options);
		return this;
	},

	get: function(){
		var instance = this.retrieve('gallery');
		if (!instance){
			instance = new Gallery(this, {}, true);
			this.store('gallery', instance);
		}
		return instance;
	}

};

Element.implement({

	playGallery: function(options){
		this.get('gallery').setup(options).play();
		return this;
	},

	pauseGallery: function(){
		this.get('gallery').pause();
		return this;
	}

});

// 19 transitions :D
Gallery.defineTransitions({

	none: function(data){
		data.previous.setStyle('display', 'none');
		return this;
	},

	fade: function(data){
		data.previous.set('tween', {duration: data.duration}).fade('out');
		return this;
	},

	crossFade: function(data){
		data.previous.set('tween', {duration: data.duration}).fade('out');
		data.next.set('tween', {duration: data.duration}).fade('in');
		return this;
	},

	fadeThroughBackground: function(data){
		var half = data.duration / 2;
		data.next.set('tween', {duration: half}).fade('hide');
		data.previous.set('tween',{
			duration: half,
			onComplete: function(){ data.next.fade('in'); }
		}).fade('out');
		return this;
	}

});

(function(){

	function getStyles(direction){
		return {
			property: (direction == 'left' || direction == 'right') ? 'left' : 'top',
			inverted: (direction == 'left' || direction == 'up') ? 1 : -1
		};
	}

	function go(type, styles, data){
		var tweenOptions = {duration: data.duration, unit: '%'};
		if (type == 'blind') {
			data.next.setStyle('z-index', 2);
		}
		if (type != 'slide') {
			data.next
			    .set('tween', tweenOptions)
			    .setStyle(styles.property, 100 * styles.inverted + '%');
			data.next.tween(styles.property, 0);
		}
		if (type != 'blind'){
			data.previous
			    .set('tween', tweenOptions)
			    .tween(styles.property, -(100 * styles.inverted));
		}
	}

	['left', 'right', 'up', 'down'].each(function(direction){

		var capitalized = direction.capitalize(),
		    blindName = 'blind' + capitalized,
		    slideName = 'slide' + capitalized;

		[
			['push' + capitalized, (function(){
				var styles = getStyles(direction);
				return function(data){
					go('push', styles, data);
				}
			}())],

			[blindName, (function(){
				var styles = getStyles(direction);
				return function(data){
					go('blind', styles, data);
				}
			}())],

			[slideName, (function(){
				var styles = getStyles(direction);
				return function(data){
					go('slide', styles, data);
				}
			}())],

			[blindName + 'Fade', function(data){
				this.fade(data)[blindName](data);
				return this;
			}]
		].each(function(transition){
			Gallery.defineTransition(transition[0], transition[1]);
		});
	});

})();




var md = md || {};
md.widgets = md.widgets || {};
md.widgets.Gallery = new Class({
	Implements: [Options, Events],
	//DEFAULT OPTIONS
	options: {
		images:null,
		thumbnails: false,
		size: null,
		clickToNext: false
	},
	initialize:function(el, slideShowInfo, sliderInfo, options){
		if(typeOf(el) == 'string') {
			this.el = $(el);
		} else {
			this.el = el;
		}
		this.setOptions(options);

		if(this.options.images) {
			var mainImageOuter = new Element('div', {'class': 'main-image-outer'});
			//var mainImageInner = new Element('div', {'class': 'main-image-inner'});
			slideShowInfo.el = new Element('div', {'class': 'main-image-inner'});

			mainImageOuter.adopt(slideShowInfo.el);
			//mainImageInner.adopt(slideShowInfo.el);

			this.el.empty();
			numberImages = this.options.images.length;
			this.options.images.each(function(img, i){
				var wrapperEl = new Element('div', {'class':'slide-wrapper wraptocenter'});
				var slideWrapperHeight = this.options.thumbnails?this.options.size.height - 90:this.options.size.height;
				if(this.options.size) {
					wrapperEl.setStyles({
						width: this.options.size.width + "px",
						height: slideWrapperHeight + "px"
					})
				}
				var imgEl = new Element('img', {src: img.src}),
					image = (i + 1) + ' of ' + numberImages;

				wrapperEl.adopt(new Element('span', { 'class': 'main-position', text:  image}));
				wrapperEl.adopt(imgEl);
				slideShowInfo.el.adopt(wrapperEl);
			}.bind(this));
			this.el.adopt(mainImageOuter);
		}
		if(this.options.size) {
			this.el.setStyles({
				width: this.options.size.width + "px",
				height: this.options.size.height + "px"
			});
		}

		if(this.options.thumbnails) {
			this.appendThumbnails(slideShowInfo.el);
			this.el.getElements('.main-image-outer').setStyle('height', this.el.getHeight()-90);			
		}
		

		this.gallery = new Gallery(slideShowInfo.el, slideShowInfo.options);
		//FIXME: Gallery shows wrong image sometimes.
		this.gallery.addEvent('showComplete', function(){
			// if(this.gallery.index != this.current) {
			// 	this.gallery.show(this.current);
			// }
		}.bind(this));

		if(this.options.clickToNext) {
			this.el.addEvent('click', function(e){
				e.preventDefault();
				this.gallery.show('next');
			}.bind(this))
		}
		$(this.gallery).addEvents({
			swipe: function(event){
		    	gallery['show' + ((event.direction == 'left') ? 'Next' : 'Previous')]({
		      		transition: 'blind' + event.direction.capitalize() 
		    	});
			}.bind(this),
			mousedown: function(event){
		    	event.stop();
			}
		});

		if(sliderInfo) {
			this.slider = new Slider(sliderInfo.el, sliderInfo.knob, sliderInfo.options);
			this.slider.addEvent('change',function(pos){
				this.current = pos;
		    	console.log('slider moved ' + pos);
		    	if(this.gallery.slides.length <= pos) {
		    		return;
		    	}
		        this.gallery.show(pos);
			}.bind(this));
		}
	},
	appendThumbnails: function(el){
		var thumbWrapOuter = new Element('div', {'class':'thumb-wrapper-outer'});
		var thumbWrapInner = new Element('div', {'class':'thumb-wrapper-inner'});
		
		thumbWrapOuter.adopt(thumbWrapInner);

		var images = this.el.getElements('img');

		images.each(function(img, i){
			thumbWrapInner.adopt(

				(new Element ('p', { 'class': (i === 0 ? 'active' : '') })).adopt(
					(new Element ('span', { 'class': 'thumb-number', text: i + 1 }))).adopt(
						new Element('img', { src: img.getAttribute('src'), 'data-pos':i })
				)
			);
		});
		
		thumbWrapInner.getChildren().addEvent('click', function(e){
			var el = e.target.getAttribute('data-pos') ? e.target : e.target.getElement('img');

			$$('.active').removeClass('active');
			el.getParent('p').addClass('active'); 

			e.preventDefault();
			this.gallery.show(parseInt(el.getAttribute('data-pos')));
		}.bind(this));

		this.el.adopt(thumbWrapOuter);
	}
});

/*
---
script: metrodigi-popup.js

description: Provides Popup widget. 

requires: 
 - Core/Core
 - More/Mask

provides: [md.widgets.Popup]
...
*/
var md= md || {};
md.widgets = md.widgets || {};
md.widgets.Popup = new Class({
    Implements:[Options],
    options: {
        closeBtn: false,
        closeBtnText: 'Close',
        position: 'fixed', //CAN be relative, so shows where clicked
        alignment: 'topLeft'
    },

    initialize: function(ele, html, options){
        this.setOptions(options);
        this.el = ele;
        if(typeOf(html) == 'string') {
            this.popupEl = Elements.from(html, false);
        } else {
            this.popupEl = html;
        }
        
        ele.set('tabindex', 0);
        ele.set('role', 'button');

        ele.addEvent('keypress', function(e){
            var wasEnterPressed = e.code == 13 || e.which == 13 || e.keyCode == 13;
            var wasSpacePressed = e.code == 32 || e.which == 32 || e.keyCode == 32;
            if(wasEnterPressed || wasSpacePressed) return this.click();
        });
        
        if (ele.getSiblings('p').length) {
            ele.set('aria-label', ele.getChildren('p')[0].get('text') + ', ' + ele.getSiblings('p')[0].get('text'))    
        }
        
        this.el.addEvent('click', this.show.bind(this));
    },
    createModal: function () {
        // Setup the modal elements.
        var modal = new Element('div', {'class':'modal'}),
            mask = new Mask(document.body, {
                destroyOnHide: true,
                width: '100%', height:'100%'
            }),
            close = function () {
                // Pause any playing media elements.
                modal.getElements('video, audio').each(function (el) {
                    el.pause();
                });
                this.modal = undefined;
                modal.destroy();
                mask.destroy();
            }.bind(this);
            closeAndStop = function (e) {
                var ev = e || event;
                close();
                ev.preventDefault();
            };

        mask.addEvent('hide', closeAndStop);
        mask.addEvent('click', closeAndStop);
        this.el.addEvent('click:relay(.close)', closeAndStop);

        if (this.options.size) {
            modal.setStyles({
                "width" : this.options.size.width+"px"
            });
        }

	 var $ = document.id;
	 
        $(mask).setStyle('position', 'fixed');

        //Populate modal
        var modalTitle = null;
        if (this.options.title && this.options.title.length > 0) {
            modalTitle = new Element('div', {'class':'modal-header', text: this.options.title});
            modal.adopt(modalTitle);
        }

        var modalBody = new Element('div', {'class':'modal-body'});
        modalBody.setStyle('height', this.options.size.height + "px");
        modalBody.adopt(this.popupEl);
        modal.adopt(modalBody);
        modal.set('tabindex',-1);

        if (this.options.closeBtn) {
            var modalFooter = new Element('div', {'class':'modal-footer'});
            modal.adopt(modalFooter);

            var closeEl = new Element('a', {
                'class':'modal-close btn primary',
                'role': 'button',
                'tabindex': 0,
                'text': this.options.closeBtnText});
            closeEl.addEvent('click', close);
            closeEl.addEvent('keypress', function(e){
                var wasEnterPressed = e.code == 13 || e.which == 13 || e.keyCode == 13;
                var wasSpacePressed = e.code == 32 || e.which == 32 || e.keyCode == 32;
                if(wasEnterPressed || wasSpacePressed) return close()
            });
            modalFooter.adopt(closeEl);
            setTimeout(function(){
                modal.focus()
                // closeEl.focus();
            }, 0)
        }

        modal.inject(document.body, 'top').hide();

        if (this.options.position == 'fixed') {
            modal.position(this.options.pos || {});
        } else {
            var getRelativePos = function (alignment) {
                if (alignment == 'topLeft') { return 'bottomRight'; }
                else if (alignment == 'topRight') { return 'bottomLeft'; }
                else if (alignment == 'bottomLeft') { return 'topRight'; }
                else { return 'topLeft'; }
            };
            modal.position({
                relativeTo: e.target,
                position: getRelativePos(this.options.alignment),
                edge: this.options.alignment
            });
        }

        this.modal = modal;
        this.mask = mask;
    },
    show: function (e) {
        // Lazily build and add the modal DOM on first attempt to show.
        if (this.modal === undefined) {
            this.createModal();
        }
        e.preventDefault();
        this.mask.show();
        this.modal.show();
        this.el.fireEvent('popupVisible', this);
    }
});


/*
---
script: metrodigi-extras.js

description: Misc components

requires: [Core/Core]


provides: [md.util.StepperElement, md.util.LinearElementStepper]

...
*/
var md = md || {};
md.util = md.util || {};
md.util.StepperElement = new Class({

	initialize: function(el, startPos, endPos, steps){
		this.el = el;
		this.startPos = startPos;
		this.endPos = endPos;
		this.steps = steps;

		this.el.setPosition(startPos);
		this.xStep = (endPos.x - startPos.x) / steps;
		this.yStep = (endPos.y - startPos.y) / steps;
	},
	toElement: function() {
		return this.el;
	},
	moveLinearTo: function(step) {
		var newPos = {
			x: this.startPos.x + (this.xStep*step),
			y: this.startPos.y + (this.yStep*step)
		}
		this.el.setPosition(newPos);
	}
})
md.util.LinearElementStepper = new Class({
	Implements: [Options, Events],
	initialize:function(modelArray, steps, options){
		this.stepperElements = [];
		this.steps = steps;
		this.setOptions(options);
		modelArray.each(function(model) {
			this.stepperElements.push(
				new md.util.StepperElement(model.el, model.startPos, model.endPos, steps)
			);
		}.bind(this));
		this.setOptions(options);
	},
	moveTo: function(step) {
		this.stepperElements.each(function(stepper) {
			stepper.moveLinearTo(step);
		})
	}
});

/*
---
script: metrodigi-sidebar.js

description: Provides Sidebar widget. 

requires: [Core/Core]

provides: [md.widgets.Sidebar]
...
*/
var md= md || {};
md.widgets = md.widgets || {};
md.widgets.Sidebar = new Class({
	Implements:[Options],
	options: {
		header: null,
		footer: null,
		content: null,
		width: null
	},
	
	//"new md.widgets.ShareWidget($('51240a0c0e50b'), 'http://www.metrodigi.com', { services: ["facebook","google","twitter"] })"
	initialize: function(ele, options){
		ele.empty();
		this.setOptions(options);
		this.el = ele;

		var clsAppend = (this.options.header?'sb-header':'') + (this.options.footer?' sb-footer':'')
		this.tbl = new Element('table', {
			cellpadding:0, 
			cellspacing:0,
			'class': clsAppend
		});
		var tbody = new Element('tbody').inject(this.tbl);
		
		//add header
		if(this.options.header && this.options.header.length>0) {
			tbody.adopt(this.addTr(this.options.header, 'header', 'sb-gradient'));
		}
		
		//add content
		tbody.adopt(this.addTr(this.options.content, 'content', ''));

		//add footer
		if(this.options.footer && this.options.footer.length>0) {
			tbody.adopt(this.addTr(this.options.footer, 'footer', 'sb-gradient'));
		}

		// Set the height of the container
		this.el.style.height = this.options.height + 'px';
		
		this.el.adopt(this.tbl);

		//$$('div[data-smartwidget-id=16]').each(function(el){ el.addClass('sidebar-scroll'); });
	},
	addTr: function(data, type, cls){
		var tr = new Element('tr');
		var td = new Element('td', {'class': 'sidebar-'+type}).inject(tr);
		var div = new Element('div', {
			'class': 'sb-inner ' + cls,
			'html': data
		});
		if(this.options.width) {
			//NOTE: 22 is for PADDING, should be changed to proper value with CSS.
			div.setStyle('width', (this.options.width-22) + 'px');
		}
		td.adopt(div);
		return tr;
	},
	toElement: function(){
		return this.el;
	}
	
});

/*
---
script: metrodigi-widgets.js

description: Provides HTML widgets. 
             1> TextSizeWidget- Widget for changing size of Text

requires: 
 - Core/Core
 - Drag.Scroll

provides: [md.widgets.TextSizeWidget, md.widgets.Tabs, md.widgets.Timeline]
...
*/
var md = md || {};
md.widgets = md.widgets || {};
md.widgets.TimeSequence = new Class({
    // INVALID_TAGS: ['AUDIO', 'VIDEO', 'IMG', 'BR', 'HR'],
    Implements:[Options],
    options: {
        snap: 25,
        snapXOffset: 200,
        contentContainer: null,
        displayTolerance: 50
    },
    points: null,
    snapped: false,
    displayed: false, //Decides whether content is displaying or not.
    maxWidth: 0,
    initialize: function(el, options){
        this.el = $(el);
        this.setOptions(options);

        var elX = this.el.getPosition().x;
        this.points = this.el.getChildren().map(function(blockEl){
            return blockEl.getPosition({relativeTo: this.el}).x - elX - this.options.snapXOffset;
        }.bind(this));
        console.log('points: ', this.points);
        this.maxWidth = this.points[this.points.length-1];

        var startVal=0;
        var self = this;
        this.drag = new Drag(el, {
            onStart: function(dragEl){
                startVal = dragEl.getPosition().x;
            },
            onDrag: function(dragEl, e){
                //console.log('draggin ' + dragEl.getPosition().x, e);
                var left = dragEl.getPosition().x;
                // if(left>0) {
                //     console.log('setting drag to 0', left);
                //     dragEl.setPosition({x: 0});
                //     return;
                // }
                left = Math.abs(left);
                var starting = Math.abs(startVal - left);


                var snap = self.options.snap;
                var snapToVal = self.getSnapValue(left);
                console.log('snap to: ', snapToVal);
                if(starting>snap && left > (snapToVal - snap)  && left < (snapToVal + snap)) {
                    console.log('snapping')
                    dragEl.setPosition({x: -snapToVal});
                    if(!self.snapped) {
                        //self.showContent(snapToVal);
                        self.snapped = true;
                    }
                } else {
                    if(self.snapped) {
                        //self.hideContent();
                        self.snapped = false;
                    }
                }

                var displayTolerance = self.options.displayTolerance;                
                if(starting>displayTolerance && left > (snapToVal - displayTolerance)  && left < (snapToVal + displayTolerance)) {
                    console.log('displaying..')
                    if(!self.displayed) {
                        self.showContent(snapToVal);
                        self.displayed = true;
                    }
                } else {
                    if(self.displayed) {
                        self.hideContent();
                        self.displayed = false;
                    }
                }
            },
            onComplete: function(dragEl) {

            },
            modifiers: {y: false},
            limit: {x: [-self.maxWidth, 0]}
        });

        this.hideContent(false);
    },
    getSnapValue: function(val){
        var returnPoint = null;
        val = val-this.options.snap;
        this.points.each(function(point) {
            if(!returnPoint && val<point) {
                returnPoint = point;
            }
        });
        return returnPoint;
    },
    showContent: function(val){
        if(this.options.contentContainer) {
            this.hideContent(true);
            this.options.contentContainer.getChildren()[this.points.indexOf(val)].fade('in');
        }
    },
    hideContent: function(fade) {
        if(this.options.contentContainer) {
            var children = this.options.contentContainer.getChildren();
            // if(fade) {
                children.fade('out');
            // } else {
                //children.hide();
            // }
        }
    }
});
            

            

/*
---
script: script: metrodigi-css3.js
description: CSS3 animation support
copyright: 
authors: [Nachiket Patel]

requires: [Core/Class.Extras, Core/Element.Style, Core/Element.Event, Core/Fx.Tween]

provides: [md.animation.Transition]
...
*/

var md = md || {};
md.animation = md.animation || {};

md.animation.Transition = new Class({
	Implements: [Options, Events],
	duration: -1,
	_direct: false,
	transitionTimings: {
		'linear'		: '0,0,1,1',
		'expo:in'		: '0.71,0.01,0.83,0',
		'expo:out'		: '0.14,1,0.32,0.99',
		'expo:in:out'	: '0.85,0,0.15,1',
		'circ:in'		: '0.34,0,0.96,0.23',
		'circ:out'		: '0,0.5,0.37,0.98',
		'circ:in:out'	: '0.88,0.1,0.12,0.9',
		'sine:in'		: '0.22,0.04,0.36,0',
		'sine:out'		: '0.04,0,0.5,1',
		'sine:in:out'	: '0.37,0.01,0.63,1',
		'quad:in'		: '0.14,0.01,0.49,0',
		'quad:out'		: '0.01,0,0.43,1',
		'quad:in:out'	: '0.47,0.04,0.53,0.96',
		'cubic:in'		: '0.35,0,0.65,0',
		'cubic:out'		: '0.09,0.25,0.24,1',
		'cubic:in:out'	: '0.66,0,0.34,1',
		'quart:in'		: '0.69,0,0.76,0.17',
		'quart:out'		: '0.26,0.96,0.44,1',
		'quart:in:out'	: '0.76,0,0.24,1',
		'quint:in'		: '0.64,0,0.78,0',
		'quint:out'		: '0.22,1,0.35,1',
		'quint:in:out'	: '0.9,0,0.1,1'
	},
	options: {
		transition: 'sine:in:out',
		properties: 'all',
		duration: 400,
		durationUnit: 'ms'
	},
	initialize: function(element, options){
		this.el = element;
		this.setOptions(options); 

		this.setProps();
	},
	setProps: function(){
		//Set styling
		var props = typeOf(this.options.properties)=='array'?this.options.properties.join(','):this.options.properties;
		if(props.length<=0) {
			return;
		}

		this.el.setStyle('-webkit-transition-property', props);
		this.el.setStyle('transition-property', props);

		var duration = this.options.duration + this.options.durationUnit;
		this.el.setStyle('-webkit-transition-duration', duration);
		this.el.setStyle('transition-duration', duration);
		
		var transitionFunc = this.transitionTimings[this.options.transition];
		if(!transitionFunc) {
			throw("unable to find transition " + this.options.transition);
		}

		var timingVal = 'cubic-bezier('+transitionFunc+')';
		this.el.setStyle('-webkit-transition-timing-function', timingVal);
		this.el.setStyle('transition-timing-function', timingVal);
		this.duration = this.options.duration;
	},
	cleanupProps: function(){
		this.el.setStyles({
			'-webkit-transition-timing-function': null,
			'transition-timing-function': null,
			'-webkit-transition-duration': null,
			'transition-duration': null,
			'-webkit-transition-property': null,
			'transition-property': null
		});
		this.duration = 0;
	},
	toElement: function(){
		return this.el;
	},
	setDirect: function(direct){
		if(direct) {
			this.cleanupProps();
		} else {
			this.setProps();
		}
		this.direct = direct;
	},
	setValue: function(valueMap, callback){
		$(this).setStyles(valueMap);
		if(callback) {
			callback.delay(this.duration);
		}
	}
}); 

/*
---
script: script: metrodigi-comicbook.js
description: Comicbook page script
copyright: 
authors: [Nachiket Patel]

requires: [md.animation.Transition]

provides: [md.widgets.ComicBook]
...
*/
var md = md || {};
md.widgets = md.widgets || {};
md.widgets.AbstractWidget = new Class({
	Implements: [Options, Events],

	initialize:function(el, options){
		this.el = el;
		this.setOptions(options);
	},
	toElement: function(){
		return this.el;
	}
});

md.widgets.CanvasAnimation = new Class({
	initialize: function(canvasEl, values) {
		this.el = canvasEl;
		// Grab our context
    	this.context = canvasEl.getContext('2d');
    
	    // Make sure we have a valid defintion of requestAnimationFrame
	    this.requestAnimationFrame =
	            
	            function(callback) {
	                return setTimeout(callback, 16);
	            };
	    this.values = values;
	},
	getRequestAnimationFrame: function(){
		return window.requestAnimationFrame ||
	            window.webkitRequestAnimationFrame ||
	            window.mozRequestAnimationFrame ||
	            window.msRequestAnimationFrame ||
	            window.oRequestAnimationFrame;
	},
	render: function() {
        // Clear the canvas
		this.context.fillStyle="#FFFFFF";
        this.context.fillRect(0, 0, $(this).width, $(this).height);
        
        // Draw the square
		this.context.fillStyle=this.values.borderColor;
        this.context.fillRect(0, 0, this.values.width, this.values.height);
        this.context.clearRect(this.values.borderWidth, this.values.borderWidth,
        	this.values.width - this.values.borderWidth*2, this.values.height - this.values.borderWidth*2);
        
        // Redraw
        this.getRequestAnimationFrame()(this.render.bind(this));
    },
    animate: function(prop, val, duration) {
		// The calculations required for the step function
		var start = new Date().getTime();
		var end = start + duration;
		var current = this.values[prop];
		var distance = val - current;

		var step = function() {
			// Get our current progres
			var timestamp = new Date().getTime();
			var progress = Math.min((duration - (end - timestamp)) / duration, 1);

			// Update the obj's property
			this.values[prop] = current + (distance * progress);

			// If the animation hasn't finished, repeat the step.
			if (progress < 1) this.getRequestAnimationFrame()(step);
		}.bind(this);

		// Start the animation
		return step();
	},

	toElement: function(){
		return this.el;
	}
});

md.widgets.helpers = md.widgets.helpers || {};
md.widgets.helpers.ComicPanelWrapper = new Class({
	Extends: md.widgets.AbstractWidget,
	initialize: function(container, app, options){
		this.container = container;
		this.app = app;
		this.parent(container, options);

		this._createHider('right', 'left');
		//Adding Bottom Last, so bottom will be on Top, and it will have Extra border
		this._createHider('bottom', 'top');

		//Hide Bottom Divs extra border
		this._createBorderHider();
	},
	_createHider: function(type, borderType) {
		var prop = type+'HiderEl';
		var left = (borderType=='top') ? 0: $(this.app).getWidth();
		var top = (borderType=='top') ? $(this.app).getHeight():-1;

		this[prop] = new Element('div', {'class':'hider hider-' + type});
		this[prop].setStyles({
			position: 'absolute',
			width: $(this.app).getWidth() + "px",
			height: $(this.app).getHeight() + "px",
			left: left,
			top: top,
			'z-index': 100,
			'background-color': this.options.appColor
		});
		this[prop].setStyle('border-'+borderType , this.options.borderWidth + 'px solid ' + this.options.borderColor);
		$(this).adopt(this[prop]);

		this[type+'Fx'] = new md.animation.Transition(this[prop], {
			properties: this.app.slide||this.app.fade?['-webkit-transform']: []
		});
	},
	_createBorderHider: function(){
		this.borderHiderEl = new Element('div');
		this.borderHiderEl.setStyles({
			width: $(this.app).getWidth(),
			height: this.options.borderWidth + 2,
			top: - (this.options.borderWidth + 2),
			position: 'absolute',
			'z-index': 2000,
			'background-color': this.options.appColor
		});
		//Add to Bottom hider
		this.bottomHiderEl.adopt(this.borderHiderEl);
	},
	set: function(x, y, width, height) {
		x = x - this.options.borderWidth;
		y = y - this.options.borderWidth;
		width = width + (this.options.borderWidth*2);

		this.rightFx.setValue({'-webkit-transform':'translate3d('+ -x +'px,0,0)'});
	    this.bottomFx.setValue({'-webkit-transform':'translate3d(0,'+ -y +'px,0)'});

	    setTimeout(function(){
	    	this.borderHiderEl.setStyles({'left':width+'px'});
	    }.bind(this), 300);
	}
})

md.widgets.ComicBook = new Class({
	Extends: md.widgets.AbstractWidget,
	current: null,
	currentPoint: 0,
	initialSize: null,
	currentTimeout: null,
	panelMode:false,
	options: {
		borderColor: "#cccccc",
		borderWidth: 2,
		points: [],
		padding: 10,
		transition: "slide",
		fadeToColor: "#000000",
		autoPlay: false,
		autoPlayInterval: 5000,
		kenBurns: false,
		classWrapper: 'eyeframe-wrapper',
		classPositioner: 'eyeframe-positioner',
		autoStart: false,
		autoStartDelay: 100,
		jumpToNext: true,
		nextPage: null,
		lastFrameAnchor: null,
		appColor: '#CCC'
	},
	createHiders: function(){
		var imgWrapper = $(this).getElement('.' + this.options.classPositioner);
		this.wrapperHelper = new md.widgets.helpers.ComicPanelWrapper(imgWrapper, this, this.options);
	},
	initialize: function(imageEl, options) {
		var el = this.createDOM(imageEl);
		this.parent(el, options);
		var load = function() {
			//Try until size is higher than 0.
			var setEl = function(){
				this.elSize = this.el.getSize();
				if(this.elSize.y == 0) {
					console.log("Height still 0, trying again");
					setEl.delay(100);
				} else {
					this._init(imageEl, options);
				}
			}.bind(this);
			setEl();
		}.bind(this);

		if(imageEl.complete) {
			console.log("Image loaded already");
			load.delay(5);
		} else {
			imageEl.addEvent('load', function(){
				console.log("Image loaded event in comicbook init");
				load.delay(5);
			}.bind(this));
		}
	},
	_init: function(imageEl, options){

		console.log("El Size: ", this.elSize);
		//support kenburns as transition.
		if(this.options.transition == "kenburns") {
			this.options.kenBurns = true;
			this.options.transition = "crossfade";
		}
		this.slide = this.options.transition == "slide";
		this.fade = (this.options.transition == "fade") || (this.options.transition == "crossfade");
		this.crossfade = this.options.transition == "crossfade";

		//create Hiders for bottom & right borders
		this.createHiders();

		this.points = this.options.points;
		this.imgWrapper = $(this).getElement('.'+this.options.classWrapper);
		this.imgWrapper.setStyles({
			'height': this.elSize.y, 'width': this.elSize.x,
			//Hardware Acc
			"-webkit-transform": 'translate3d(0,0,0)'
		});

		// this.canvasEl = $(this).getElement('canvas');
		// this.canvasEl.setAttribute('height', this.elSize.y);
		// this.canvasEl.setAttribute('width', this.elSize.x);
		// this.canvasFx = new md.widgets.CanvasAnimation(this.canvasEl, {
		// 	width: this.elSize.x, height:this.elSize.y, borderWidth: this.options.borderWidth, borderColor: this.options.borderColor});
		// this.canvasFx.render();

	    this.wrapperFx = new md.animation.Transition(this.imgWrapper, {
			properties: this.slide||this.fade?['height', 'width', 'border']: []
		});

		this.img = $(this).getElement('.' +this.options.classWrapper + ' img');
		this.img.setStyles({
			'height': this.elSize.y, 'width': this.elSize.x,
			"-webkit-transform-origin-x": 0,
			"-webkit-transform-origin-y": 0
		});
		this.initialSize = this.img.getSize();
	    this.imgFx = new md.animation.Transition(this.img, {
			properties: this.slide?['-webkit-transform', '-webkit-filter']: ['opacity']
		});

	    if(this.options.kenBurns) {
	    	this.kenBurnsEl = new Element('div', 'ken-burns-wrapper');
	    	this.kenBurnsEl.replaces(this.img);
	    	this.kenBurnsEl.adopt(this.img);
	    }

	    if(this.crossfade) {
	    	this.otherImg = this.img.clone();
	    	this.otherImgFx = new md.animation.Transition(this.otherImg, {
				properties: this.slide?['-webkit-transform', '-webkit-filter']: ['opacity']
			});
			this.otherImg.setStyle('opacity','0');
			this.otherImg.inject(this.img, 'after');
	    }


	    this.imgPositioner = $(this).getElement('.' + this.options.classPositioner);
	    this.imgPositioner.setStyles({
	    	'height': this.elSize.y, 'width': this.elSize.x
	    });
		this.positionerFx = new md.animation.Transition(this.imgPositioner, {
			properties: this.slide||this.fade?['-webkit-transform']: []
		});

		// Handle jumping to the next page (continuous panels mode).
		if (this.options.jumpToNext) {
			var inEditor    = window.parent && window.parent.Lindgren !== undefined,
				currentPage = inEditor ? Number(window.parent.Lindgren.core.currentPage) : parseInt(document.body.get('id').substr(4), 10),
				nextPage    = currentPage + 1;

			// Check the page number stored in local storage.  If it matches the current page number than we are in continuous panel mode
			// and set autoStart to true.
			if (currentPage === Number(localStorage.continuouspanels)) {
				this.options.autoStart = true;
			}

			// Store a reference to the next page number so that we can put it in local storage when all the panels have been viewed.
			this.nextPage = nextPage;

			// In the editor.
			if (inEditor) {
				// Set the last frame anchor to call a Lindgren method to actually change the page.
				this.options.lastFrameAnchor = 'javascript:window.parent.Lindgren.core.changePageTo(' + nextPage + ')';
			// In a book.
			} else {
				// Set the last frame anchor to a link to the next book page.
				this.options.lastFrameAnchor = this.options.nextPage;
			}

			// Remove any previously stored local storage data to prevent eyeframes from initiating continuous panels mode when
			// not appropriate.
			delete localStorage.continuouspanels;
		}

	    this.cleanUp(true);

	    var mask = new Mask(this.imgWrapper, { style: { opacity: 0 } });

	   	var anchorOverlay = new Element('a', {
	   		'href': this.options.lastFrameAnchor,
	   		'styles': {
	   			'display':'block',
	   			'width':'100%',
	   			'height':'100%'
	   		}
	   	});
	   	$(mask).adopt(anchorOverlay);
	    mask.show();

	    $(anchorOverlay).addEvent('click', function(e){
			// If last frame and nextPage is set in options, goto the next page.
			if (this.options.nextPage && this.currentPoint == this.points.length) {
				// Save the next page number in local storage to enable continuous panels for the next page.
				localStorage.continuouspanels = this.nextPage;
				return;
			}
	    	
	    	e.stop();
	    	this._clicked(e);
	    }.bind(this));

	    // Clicking away from a panel closes it.
	    $(this).addEvent('click', this.cleanUp.bind(this));

	    if(this.options.autoStart) {
	    	this.next.delay(this.options.autoStartDelay,this);
	    }
	},
	createDOM: function(imageEl) {
		//remove styles which can cause script to perform wrong
		imageEl.setStyles({
			'max-width': 'initial',
			'max-height': 'initial'
		});
		var positionerEl = new Element('div', {'class': this.options.classPositioner});
		var wrapperEl = new Element('div', {'class': this.options.classWrapper});

		//var canvasEl = new Element('canvas', {'class':'wrap-canvas', 'style':'position: absolute'});
		wrapperEl.wraps(imageEl);
		//wrapperEl.adopt(canvasEl);
		positionerEl.wraps(wrapperEl);
		var appEl = positionerEl.getParent();
		appEl.setStyles({
			'background-color': this.options.appColor,
			'overflow': 'hidden'
		});
		return appEl;
	},
	setBgColor: function(){
		var bgColor = this.fade && !this.crossfade;
		this.imgWrapper.setStyle("background-color", bgColor?this.options.fadeToColor:"transparent");
	},
	clearBgColor: function(){
		this.imgWrapper.setStyle("background-color", null);
	},
	setCurrent: function(current){
		this.current=current;
	},
	_clicked: function(e){
		e.stop();
		this.next();
		//Clear autostart if not first slide
		if(this.currentPoint!=1) {
			this.cleanupTimeout();
		}
	},
	next: function(){
		//Clear if timer is set
		if(this.currentTimeout) {
			this.cleanupTimeout();
		}

		if(this.currentPoint > this.points.length) {
			return;
		} else if(this.currentPoint == this.points.length) {
			this.currentPoint = 0;
			this.cleanUp();
			return;
		}
		this.setTo(this.points[this.currentPoint]);
		this.currentPoint++;	
		this.autoPlayIfRequired();
	},
	cleanupTimeout: function(){
		if(this.currentTimeout) {
			clearTimeout(this.currentTimeout);
			this.currentTimeout = null;
		}
	},
	autoPlayIfRequired: function(){
		if(this.options.autoPlay) {
			this.currentTimeout = this.next.bind(this).delay(this.options.autoPlayInterval);
		}
	},
	_setFxMode: function(direct) {
		this.wrapperFx.setDirect(direct);
		this.positionerFx.setDirect(direct);
		this.imgFx.setDirect(direct);
		if(this.crossfade) {
			this.otherImgFx.setDirect(direct);
		}
	},
	cleanUp: function(fxMode){
		this.clearBgColor();
		this.cleanupTimeout();
		this.cleanUpKenBurns();
		this._setFxMode(fxMode);
		this.setTo(
			{ height: this.initialSize.y , imageTop: 0, imageLeft: 0, width: this.initialSize.x, reset: true },
			function(){
				this._setFxMode(false);
				this.setBgColor();
			}.bind(this)
		);
		this.panelMode = false;
		this.current=null;
		this.currentPoint=0;
	},
	cleanUpKenBurns: function(){
		if(this.options.kenBurns) {
			this.kenBurnsEl.removeClass('kenBurnsIn');
			this.kenBurnsEl.removeClass('kenBurnsOut');
		}
	},
	setTo: function(frame, callback){
		this._action(frame, callback);
	},
	_action: function(frame, callback){
		this.panelMode = true;
		//Can be -1 for reset 
		var point = this.points.indexOf(frame);

		//this.imgFx.setValue({'-webkit-filter':'blur(2px)'});
		var slideData = this.calculateSlideData(frame);

		//this.canvasFx.animate('width', slideData.width, 400);
		//this.canvasFx.animate('height', slideData.height, 400);

		this.wrapperHelper.set(slideData.containerWidth-slideData.width, slideData.containerHeight-slideData.height,
			slideData.width, slideData.height);
		//this.wrapperFx.setValue({'height': slideData.height, 'width': slideData.width });
	    this.positionerFx.setValue({'-webkit-transform':'translate3d('+ slideData.leftPos +'px,'+ slideData.topPos +'px,0)'}, 
	    function(){}.bind(this));//{'top': topPos, 'left': leftPos });
	
		var performImageAnim= function(imgFx){
			var imgAnim = 'translate3d('+ slideData.imageLeft +'px,'+ slideData.imageTop +'px,0) scale('+ slideData.ratio +')';
	    	imgFx.setValue({'-webkit-transform':imgAnim}, function(){
	    		//Final callback for frame anim done.
	    		if(callback)  { callback(); }
	    	}.bind(this));	
		}.bind(this);
		
		var switchImgObjects = function() {
			var tmpFx = this.imgFx;
			var tmpImg = this.img;

			this.imgFx = this.otherImgFx;
			this.img = this.otherImg;

			this.otherImgFx = tmpFx;
			this.otherImg = tmpImg;
			this.otherImgFx.setValue({'opacity':'0'});
		}.bind(this);

	    if(this.fade) {
	    	if(this.crossfade) {
	    		performImageAnim(this.otherImgFx);
	    		this.otherImgFx.setValue({'opacity': '1'}, function(){
	    			switchImgObjects();
	    		}.bind(this));
    			//this.otherImgFx.setValue({'opacity':'1'});
	    	};
	    	this.imgFx.setValue({'opacity': '0'}, function(){
	    		if(!this.crossfade) {
	    			this.imgFx.setValue({'opacity':'1'});	
	    			performImageAnim(this.imgFx);
	    		}
			}.bind(this));
	   	} else {
	   		performImageAnim(this.imgFx);
	   	}

	   	//if comic mode
	   	if(point>=0) {
	   		this.imgWrapper.setStyles({'border': this.options.borderWidth + "px solid " + this.options.borderColor});
	   	} else {
	   		this.imgWrapper.setStyles({'border': "0px solid " + this.options.borderColor});
	   	}
   		//If not reset frame and kenburns then peform kenburns
	   	if(this.options.kenBurns && point>=0) {
			this.cleanUpKenBurns();
			this.kenBurnsEl.addClass(point%2?'kenBurnsOut':'kenBurnsIn');
		}
	    this.setCurrent(frame);
	},
	calculateSlideData: function(frame){
		var containerSize = $(this).getSize();
		var imgSize = this.img.getSize();

		var padding = this.options.padding;
		var width = -1;
		var height = -1;
		var ratio = 1;
		var leftPos = padding;
		var topPos = padding;
		var borderWidth = this.options.borderWidth*2;
		if(frame.reset) {
			borderWidth = 0;
			padding = 0;
		}
		//frame.width = frame.width + this.options.borderWidth;

		width = containerSize.x - (padding*2) - (borderWidth);
		height = containerSize.y - (padding*2) - (borderWidth);

		var widthRatio = width/frame.width;
		var heightRatio = height/frame.height;

		if(widthRatio < heightRatio) {
			ratio = widthRatio;
			height = frame.height * ratio;
			topPos = (containerSize.y - height - borderWidth)/2;
		} else {
			ratio = heightRatio;
			width = frame.width*ratio;
			leftPos = (containerSize.x - width - borderWidth)/2;
		}

		var imgRatioSize = {x: imgSize.x*ratio, y: imgSize.y*ratio};
		var imageTop = (imgRatioSize.y* -frame.imageTop / imgSize.y);
		var imageLeft = (imgRatioSize.x* -frame.imageLeft / imgSize.x);

		var slideData = {
			width: width,
			height: height,
			ratio: ratio,
			leftPos: leftPos,
			topPos: topPos,
			imageTop: imageTop,
			imageLeft: imageLeft,
			containerWidth: containerSize.x,
			containerHeight: containerSize.y
		};
		return slideData;
	}
})

/*
---
script: metrodigi-image-compare.js

description: Provides a filmstrip and two image displays which are used to compare two images at once.

requires: 
	- Core/DomReady
	- Core/Class

provides: [md.widgets.ImageCompare]
...
*/

var md = md || {};
md.widgets = md.widgets || {};
md.widgets.ImageCompare = new Class({
    Implements: [Options, Events],
    options: {
        featured : { left: null, right: null },
        images   : [],
        zoom     : false
    },
    initialize: function (el, options) {
        var makeDrag = function (e) {
            var clone = e.target.clone(),
                wrap  = new Element('div', { 'class': 'drag-clone' }).setStyles(Object.merge(e.target.getCoordinates(), { opacity: '0.6', position: 'absolute', display: 'block' })),
                drag;

            (this.refowable ? this.el : document.body).adopt(wrap.adopt(clone));

            drag = new Drag.Move(wrap, {
                container: this.reflowable ? this.el : document.body,
                droppables: this.el.getElements('.drop-left, .drop-right'),
                onDrag: this.reflowable ? function (el, e) { e.stop(); el.setStyle('top', e.event.pageY); } : function (el, e) { e.stop(); },
                onDrop: function (el, drop) {
                    // Manually calculate the dropped-on droppable if this is a reflowable.
                    if (this.reflowable) {
                        var abs = Math.abs;

                        drop = this.el.getElements('.drop-left, .drop-right').map(function (drop) {
                            // Get sizing information for each droppable and the position of the draggable relative to it.
                            var position = Object.merge(drop.getCoordinates(), el.getPosition(drop));

                            return {
                                x: position.x,
                                y: position.y,
                                w: position.width,
                                h: position.height,
                                el: drop
                            };
                        }).filter(function (pos) {
                            // Filter out droppables that are not intersected by the draggable.
                            return abs(pos.x) < pos.w && abs(pos.y) < pos.h;
                        }).reduce(function (best, cur) {
                            // Use the current if we don't have a best choice.
                            if (best.el === null) return cur;

                            // Determine whether the current is better than the currently selected best.
                            return (abs(best.x) + abs(best.y) < abs(cur.x) + abs(cur.y)) ? best : cur;
                        }, { el: null }).el;
                    }

                    if (drop) {
                        if (this.options.zoom && !this.reflowable) {
                            this.makeImageMap(drop, el.getElement('img'));
                        } else {
                            drop.empty().adopt(el.getElement('img'));
                        }
                    }

                    el.destroy();
                    drag.detach();
                }.bind(this),
                onCancel: function (el) { el.destroy(); },
                onComplete: function (el) { el.destroy(); }
            });

            e.stop();
            drag.start(e);
        }.bind(this);

        this.reflowable = document.body.get('data-book-type') === 'RF3' && !(window.parent && window.parent.Lindgren);
        if (this.reflowable) {
            this.refactorDrag();
        }

        this.el = el;
        this.setOptions(options);
        this.render();

        this.el.addEvent('touchstart:relay(.film-strip img)', makeDrag);
        this.el.addEvent('mousedown:relay(.film-strip img)', makeDrag);
    },
    defaultZoom: function (dropCoor, img) {
        var defaultZoom;

        if (dropCoor.width < dropCoor.height) {
            // Ratio applied to width, zoom level applied to height.
            if (img.naturalWidth > img.naturalHeight) {
                defaultZoom = dropCoor.width / (img.naturalWidth / img.naturalHeight);
            } else {
                defaultZoom = dropCoor.width / (img.naturalHeight / img.naturalWidth);
            }
        } else {
            // Ratio applied to height, zoom level applied to width.
            if (img.naturalWidth > img.naturalHeight) {
                defaultZoom = dropCoor.height / (img.naturalHeight / img.naturalWidth);
            } else {
                defaultZoom = dropCoor.height / (img.naturalWidth / img.naturalHeight);
            }
        }

        return defaultZoom;
    },
    refactorDrag: function () {
        // Make drag events use client instead of page coordinates in reflowables.
        Class.refactor(Drag, {
            start: function (e) {
                e.page = e.client;
                this.previous(e);
            },
            drag: function (e) {
                e.page = e.client;
                this.previous(e);
            }
        });
    },
    makeImageMap: function (container, img) {
        var coor        = container.getCoordinates(),
            imageMap    = new Element('div').setStyles(coor),
            defaultZoom = this.defaultZoom(coor, img);

        container.empty().adopt(imageMap);

        new md.widgets.ImageMap(imageMap, {
            imageUrl    : img.get('src'),
            defaultZoom : defaultZoom,
            maxZoom     : defaultZoom * 2
        });
    },
    render: function () {
        var leftBox   = new Element('div', { 'class': 'drop-left', text: 'Drag an image here to compare.' }),
            rightBox  = new Element('div', { 'class': 'drop-right', text: 'Drag an image here to compare.' }),
            filmStripWrapper = new Element('div', { 'class': 'film-strip-wrapper' }),
            filmStrip = new Element('div', { 'class': 'film-strip' }),
            imgs      = this.options.images.map(function (img) { return new Element('img', { src: img.url }); });

        filmStripWrapper.adopt(filmStrip.adopt(imgs));
        this.el.empty().adopt(leftBox, rightBox, filmStripWrapper);

        // Add the starting images if they are present.
        if (this.options.featured.left) {
            var leftImg = new Element('img', { src: this.options.featured.left.url });
            leftBox.empty().adopt(leftImg);
            if (this.options.zoom && !this.reflowable) {
                leftImg.onload = function () { this.makeImageMap(leftBox, leftImg); }.bind(this);
            }
        }
        if (this.options.featured.right) {
            var rightImg = new Element('img', { src: this.options.featured.right.url });
            rightBox.empty().adopt(rightImg);
            if (this.options.zoom && !this.reflowable) {
                rightImg.onload = function () { this.makeImageMap(rightBox, rightImg); }.bind(this);
            }
        }

        // If we are in a reflowable.
        if (this.reflowable) {
            this.el.setStyle('position', 'relative');
            this.el.parentNode.addClass('page-break');
        }
    }
});
