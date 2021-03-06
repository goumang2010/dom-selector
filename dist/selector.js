/*
 * dom-css-selector v1.1.4, bundle: 2017-04-13 18:19
 */
(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(global.selector = factory());
}(this, (function () {

/*
 * Copyright (C) 2015 Pavel Savshenko
 * Copyright (C) 2011 Google Inc.  All rights reserved.
 * Copyright (C) 2007, 2008 Apple Inc.  All rights reserved.
 * Copyright (C) 2008 Matt Lilek <webkit@mattlilek.com>
 * Copyright (C) 2009 Joseph Pecoraro
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *
 * 1.  Redistributions of source code must retain the above copyright
 *     notice, this list of conditions and the following disclaimer.
 * 2.  Redistributions in binary form must reproduce the above copyright
 *     notice, this list of conditions and the following disclaimer in the
 *     documentation and/or other materials provided with the distribution.
 * 3.  Neither the name of Apple Computer, Inc. ("Apple") nor the names of
 *     its contributors may be used to endorse or promote products derived
 *     from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY APPLE AND ITS CONTRIBUTORS "AS IS" AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL APPLE OR ITS CONTRIBUTORS BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
// import './polyfill/array.filter';
// import './polyfill/array.map';
var Node = window.Node || {
	ELEMENT_NODE: 1,
	DOCUMENT_NODE: 9
};
var cssPath = function cssPath(node) {
	if (node.nodeType !== Node.ELEMENT_NODE) {
		return "";
	}
	var steps = [];
	var contextNode = node;
	while (contextNode) {
		var step = _cssPathStep(contextNode, contextNode === node);
		if (!step) {
			break;
		} // Error - bail out early.
		steps.push(step);
		contextNode = contextNode.parentNode;
	}
	steps.reverse();
	return steps.join(" > ");
};
var _cssPathStep = function _cssPathStep(node, isTargetNode) {
	if (node.nodeType !== Node.ELEMENT_NODE) {
		return null;
	}
	var id = node.getAttribute("id");
	var nodeName = node.nodeName.toLowerCase();
	if (id) {
		return new DOMNodePathStep(nodeName.toLowerCase() + idSelector(id), true);
	}
	var parent = node.parentNode;
	if (!parent || parent.nodeType === Node.DOCUMENT_NODE) {
		return new DOMNodePathStep(nodeName.toLowerCase(), true);
	}
	/**
  * @param {DOMNode} node
  * @return {Array.<string>}
  */
	function prefixedElementClassNames(node) {
		var classAttribute = node.getAttribute("class");
		if (!classAttribute) {
			return [];
		}
		classAttribute = classAttribute.split(/\s+/g);
		var result = [];
		for (var _i = 0, len = classAttribute.length; _i < len; _i++) {
			var clsAttr = classAttribute[_i];
			if (clsAttr && clsAttr.indexOf('active') === -1) {
				// The prefix is required to store "__proto__" in a object-based map.
				result.push("$" + clsAttr);
			}
		}
		return result;
	}
	/**
  * @param {string} id
  * @return {string}
  */
	function idSelector(id) {
		return "#" + escapeIdentifierIfNeeded(id);
	}
	/**
  * @param {string} ident
  * @return {string}
  */
	function escapeIdentifierIfNeeded(ident) {
		if (isCSSIdentifier(ident)) {
			return ident;
		}
		var shouldEscapeFirst = /^(?:[0-9]|-[0-9-]?)/.test(ident);
		var lastIndex = ident.length - 1;
		return ident.replace(/./g, function (c, i) {
			return shouldEscapeFirst && i === 0 || !isCSSIdentChar(c) ? escapeAsciiChar(c, i === lastIndex) : c;
		});
	}
	/**
  * @param {string} c
  * @param {boolean} isLast
  * @return {string}
  */
	function escapeAsciiChar(c, isLast) {
		return "\\" + toHexByte(c) + (isLast ? "" : " ");
	}
	/**
  * @param {string} c
  */
	function toHexByte(c) {
		var hexByte = c.charCodeAt(0).toString(16);
		if (hexByte.length === 1) {
			hexByte = "0" + hexByte;
		}
		return hexByte;
	}
	/**
  * @param {string} c
  * @return {boolean}
  */
	function isCSSIdentChar(c) {
		if (/[a-zA-Z0-9_-]/.test(c)) {
			return true;
		}
		return c.charCodeAt(0) >= 0xA0;
	}
	/**
  * @param {string} value
  * @return {boolean}
  */
	function isCSSIdentifier(value) {
		return (/^-?[a-zA-Z_][a-zA-Z0-9_-]*$/.test(value)
		);
	}
	var prefixedOwnClassNamesArray = prefixedElementClassNames(node);
	var needsClassNames = false;
	var needsNthChild = false;
	var ownIndex = -1;
	var siblings = parent.children;
	var siblingsNodeNames = [];
	for (var i = 0; (ownIndex === -1 || !needsNthChild) && i < siblings.length; ++i) {
		var sibling = siblings[i];
		var siblingName = sibling.nodeName.toLowerCase();
		siblingsNodeNames.push(siblingName);
		if (sibling === node) {
			ownIndex = i;
			continue;
		}
		if (needsNthChild) {
			continue;
		}
		if (siblingName !== nodeName.toLowerCase()) {
			continue;
			// ignore .wrap
		} else if (parent.nodeName.toLowerCase() !== 'body') {
			needsNthChild = true;
			continue;
		}
		needsClassNames = true;
		var ownClassNames = prefixedOwnClassNamesArray;
		var ownClassNameCount = 0;
		for (var name in ownClassNames) {
			++ownClassNameCount;
		}
		if (ownClassNameCount === 0) {
			needsNthChild = true;
			continue;
		}
		var siblingClassNamesArray = prefixedElementClassNames(sibling);
		for (var j = 0; j < siblingClassNamesArray.length; ++j) {
			var siblingClass = siblingClassNamesArray[j];
			var hasSameClass = false;
			for (var c = 0, len = ownClassNames.length; c < len; c++) {
				if (ownClassNames[c] === siblingClass) {
					hasSameClass = true;
					break;
				}
			}
			if (hasSameClass) {
				continue;
			}
			delete ownClassNames[siblingClass];
			if (! --ownClassNameCount) {
				needsNthChild = true;
				break;
			}
		}
	}
	var result = nodeName.toLowerCase();
	if (isTargetNode && nodeName.toLowerCase() === "input" && node.getAttribute("type") && !node.getAttribute("id") && !node.getAttribute("class")) {
		result += "[type=\"" + node.getAttribute("type") + "\"]";
	}
	if (needsNthChild) {
		// for IE8  replcae nth-child with +
		var tmpres = siblingsNodeNames[0] + ":first-child";
		for (var _i2 = 1; _i2 <= ownIndex; _i2++) {
			tmpres += '+' + siblingsNodeNames[_i2];
		}
		result = tmpres;
		// result += ":nth-child(" + (ownIndex + 1) + ")";
	} else if (needsClassNames) {
		for (var prefixedName in prefixedOwnClassNamesArray) {
			if (prefixedOwnClassNamesArray.hasOwnProperty(prefixedName)) {
				result += "." + escapeIdentifierIfNeeded(prefixedOwnClassNamesArray[prefixedName].substr(1));
			}
		}
	}
	return new DOMNodePathStep(result, false);
};
/**
 * @constructor
 * @param {string} value
 */
var DOMNodePathStep = function DOMNodePathStep(value) {
	this.value = value;
};
DOMNodePathStep.prototype = {
	/**
  * @return {string}
  */
	toString: function toString() {
		return this.value;
	}
};

return cssPath;

})));
