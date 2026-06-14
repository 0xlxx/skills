var LearnVis = (function(exports) {

Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

//#region vis/tokens.ts
/** 7 语义色 + 7 填充变体，全部使用 OKLCH 色彩空间 */
	const TOKENS = {
		primary: "oklch(0.52 0.18 68)",
		accent: "oklch(0.62 0.15 155)",
		danger: "oklch(0.48 0.18 22)",
		warning: "oklch(0.58 0.20 85)",
		info: "oklch(0.50 0.12 240)",
		muted: "oklch(0.55 0.02 65)",
		success: "oklch(0.48 0.18 150)",
		fills: {
			primary: "oklch(0.88 0.06 68)",
			accent: "oklch(0.88 0.06 155)",
			danger: "oklch(0.88 0.04 22)",
			warning: "oklch(0.90 0.08 85)",
			info: "oklch(0.88 0.04 240)",
			muted: "oklch(0.92 0.01 75)",
			success: "oklch(0.88 0.06 150)"
		}
	};
	const COLORS = {
		primary: TOKENS.primary,
		accent: TOKENS.accent,
		danger: TOKENS.danger,
		warning: TOKENS.warning,
		info: TOKENS.info,
		muted: TOKENS.muted,
		success: TOKENS.success
	};
	/** 给 OKLCH 颜色附加透明度，兼容非 oklch 颜色原样返回 */
	const alpha = (c, pct = 15) => {
		const color = COLORS[c] || TOKENS.fills[c] || c;
		if (!color.startsWith("oklch(")) return color;
		const a = (pct / 100).toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
		return color.replace(/ \/ [\d.]+\s*\)$/, "").replace(/\)$/, ` / ${a})`);
	};
	/** 统一调色板工厂：每个语义色返回 { fg, bg, a(pct) } */
	const palette = () => ({
		dim: {
			fg: TOKENS.muted,
			bg: TOKENS.fills.muted,
			a: (p) => alpha(TOKENS.muted, p)
		},
		accent: {
			fg: TOKENS.accent,
			bg: TOKENS.fills.accent,
			a: (p) => alpha(TOKENS.accent, p)
		},
		danger: {
			fg: TOKENS.danger,
			bg: TOKENS.fills.danger,
			a: (p) => alpha(TOKENS.danger, p)
		},
		primary: {
			fg: TOKENS.primary,
			bg: TOKENS.fills.primary,
			a: (p) => alpha(TOKENS.primary, p)
		},
		success: {
			fg: TOKENS.success,
			bg: TOKENS.fills.success,
			a: (p) => alpha(TOKENS.success, p)
		},
		warning: {
			fg: TOKENS.warning,
			bg: TOKENS.fills.warning,
			a: (p) => alpha(TOKENS.warning, p)
		},
		info: {
			fg: TOKENS.info,
			bg: TOKENS.fills.info,
			a: (p) => alpha(TOKENS.info, p)
		},
		muted: {
			fg: TOKENS.muted,
			bg: TOKENS.fills.muted,
			a: (p) => alpha(TOKENS.muted, p)
		}
	});

//#endregion
//#region vis/geometry.ts
	const len = (dx, dy) => Math.sqrt(dx * dx + dy * dy);
	const exitPt = (n, tx, ty, { nW = 34, nH = 26, dR = 8, gap = 0 } = {}) => {
		if (n.t === "dummy") {
			const dx = tx - n.x, dy = ty - n.y, l = len(dx, dy);
			return {
				x: n.x + dx / l * dR,
				y: n.y + dy / l * dR
			};
		}
		const dy = ty - n.y;
		if (Math.abs(dy) > 10) return {
			x: n.x,
			y: n.y + Math.sign(dy) * (nH / 2)
		};
		return {
			x: n.x + Math.sign(tx - n.x) * (nW / 2),
			y: n.y
		};
	};
	const entryPt = (n, fx, fy, { nW = 34, nH = 26, dR = 8, gap = 0 } = {}) => {
		if (n.t === "dummy") {
			const dx = n.x - fx, dy = n.y - fy, l = len(dx, dy);
			return {
				x: n.x - dx / l * (dR + gap),
				y: n.y - dy / l * (dR + gap)
			};
		}
		const dy = n.y - fy;
		if (Math.abs(dy) > 10) return {
			x: n.x,
			y: n.y - Math.sign(dy) * (nH / 2 + gap)
		};
		return {
			x: n.x - Math.sign(n.x - fx) * (nW / 2 + gap),
			y: n.y
		};
	};
	const getBounds = (nodes, { nW = 34, nH = 26, dR = 8, pad = 8 } = {}) => {
		if (!nodes.length) return null;
		const xs = nodes.map((n) => n.x - (n.t === "dummy" ? dR : nW / 2));
		const xe = nodes.map((n) => n.x + (n.t === "dummy" ? dR : nW / 2));
		const ys = nodes.map((n) => n.y - (n.t === "dummy" ? dR : nH / 2));
		const ye = nodes.map((n) => n.y + (n.t === "dummy" ? dR : nH / 2));
		return {
			mx: Math.min(...xs) - pad,
			Mx: Math.max(...xe) + pad,
			my: Math.min(...ys) - pad,
			My: Math.max(...ye) + pad
		};
	};
	const centerIn = (rect) => ({
		x: rect.x + rect.w / 2,
		y: rect.y + rect.h / 2
	});
	const distribute = (count, container, { dir = "v", gap = 16, itemW, itemH, align = "center" } = {}) => {
		const iw = itemW || 40, ih = itemH || 30;
		const out = [];
		if (dir === "v") {
			const totalH = count * ih + (count - 1) * gap;
			const sy = container.y + (container.h - totalH) / 2;
			const cx = align === "center" ? container.x + container.w / 2 : align === "start" ? container.x + iw / 2 : container.x + container.w - iw / 2;
			for (let i = 0; i < count; i++) out.push({
				x: cx,
				y: sy + i * (ih + gap) + ih / 2
			});
		} else {
			const totalW = count * iw + (count - 1) * gap;
			const sx = container.x + (container.w - totalW) / 2;
			const cy = container.y + container.h / 2;
			for (let i = 0; i < count; i++) out.push({
				x: sx + i * (iw + gap) + iw / 2,
				y: cy
			});
		}
		return out;
	};
	/** Half-width of a marker arrow tip, including offset. Used for edge endpoint adjustment. */
	function markerHalf(config) {
		return ((config?.width ?? config?.size ?? 10) + (config?.offset ?? 0) + 2) / 2;
	}
	/** Offset line endpoints by given radii. Marker tip extends outward from line end. */
	function offsetLine(from, to, fromR, toR, _directed = true) {
		const dx = to[0] - from[0], dy = to[1] - from[1];
		const l = len(dx, dy);
		const ux = dx / l, uy = dy / l;
		return {
			x1: from[0] + ux * fromR,
			y1: from[1] + uy * fromR,
			x2: to[0] - ux * toR,
			y2: to[1] - uy * toR
		};
	}

//#endregion
//#region node_modules/.pnpm/d3-dispatch@3.0.1/node_modules/d3-dispatch/src/dispatch.js
	var noop = { value: () => {} };
	function dispatch() {
		for (var i = 0, n = arguments.length, _ = {}, t; i < n; ++i) {
			if (!(t = arguments[i] + "") || t in _ || /[\s.]/.test(t)) throw new Error("illegal type: " + t);
			_[t] = [];
		}
		return new Dispatch(_);
	}
	function Dispatch(_) {
		this._ = _;
	}
	function parseTypenames$1(typenames, types) {
		return typenames.trim().split(/^|\s+/).map(function(t) {
			var name = "", i = t.indexOf(".");
			if (i >= 0) name = t.slice(i + 1), t = t.slice(0, i);
			if (t && !types.hasOwnProperty(t)) throw new Error("unknown type: " + t);
			return {
				type: t,
				name
			};
		});
	}
	Dispatch.prototype = dispatch.prototype = {
		constructor: Dispatch,
		on: function(typename, callback) {
			var _ = this._, T = parseTypenames$1(typename + "", _), t, i = -1, n = T.length;
			if (arguments.length < 2) {
				while (++i < n) if ((t = (typename = T[i]).type) && (t = get$1(_[t], typename.name))) return t;
				return;
			}
			if (callback != null && typeof callback !== "function") throw new Error("invalid callback: " + callback);
			while (++i < n) if (t = (typename = T[i]).type) _[t] = set$1(_[t], typename.name, callback);
			else if (callback == null) for (t in _) _[t] = set$1(_[t], typename.name, null);
			return this;
		},
		copy: function() {
			var copy = {}, _ = this._;
			for (var t in _) copy[t] = _[t].slice();
			return new Dispatch(copy);
		},
		call: function(type, that) {
			if ((n = arguments.length - 2) > 0) for (var args = new Array(n), i = 0, n, t; i < n; ++i) args[i] = arguments[i + 2];
			if (!this._.hasOwnProperty(type)) throw new Error("unknown type: " + type);
			for (t = this._[type], i = 0, n = t.length; i < n; ++i) t[i].value.apply(that, args);
		},
		apply: function(type, that, args) {
			if (!this._.hasOwnProperty(type)) throw new Error("unknown type: " + type);
			for (var t = this._[type], i = 0, n = t.length; i < n; ++i) t[i].value.apply(that, args);
		}
	};
	function get$1(type, name) {
		for (var i = 0, n = type.length, c; i < n; ++i) if ((c = type[i]).name === name) return c.value;
	}
	function set$1(type, name, callback) {
		for (var i = 0, n = type.length; i < n; ++i) if (type[i].name === name) {
			type[i] = noop, type = type.slice(0, i).concat(type.slice(i + 1));
			break;
		}
		if (callback != null) type.push({
			name,
			value: callback
		});
		return type;
	}

//#endregion
//#region node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/namespaces.js
	var xhtml = "http://www.w3.org/1999/xhtml";
	var namespaces_default = {
		svg: "http://www.w3.org/2000/svg",
		xhtml,
		xlink: "http://www.w3.org/1999/xlink",
		xml: "http://www.w3.org/XML/1998/namespace",
		xmlns: "http://www.w3.org/2000/xmlns/"
	};

//#endregion
//#region node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/namespace.js
	function namespace_default(name) {
		var prefix = name += "", i = prefix.indexOf(":");
		if (i >= 0 && (prefix = name.slice(0, i)) !== "xmlns") name = name.slice(i + 1);
		return namespaces_default.hasOwnProperty(prefix) ? {
			space: namespaces_default[prefix],
			local: name
		} : name;
	}

//#endregion
//#region node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/creator.js
	function creatorInherit(name) {
		return function() {
			var document = this.ownerDocument, uri = this.namespaceURI;
			return uri === "http://www.w3.org/1999/xhtml" && document.documentElement.namespaceURI === "http://www.w3.org/1999/xhtml" ? document.createElement(name) : document.createElementNS(uri, name);
		};
	}
	function creatorFixed(fullname) {
		return function() {
			return this.ownerDocument.createElementNS(fullname.space, fullname.local);
		};
	}
	function creator_default(name) {
		var fullname = namespace_default(name);
		return (fullname.local ? creatorFixed : creatorInherit)(fullname);
	}

//#endregion
//#region node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selector.js
	function none() {}
	function selector_default(selector) {
		return selector == null ? none : function() {
			return this.querySelector(selector);
		};
	}

//#endregion
//#region node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/select.js
	function select_default$2(select) {
		if (typeof select !== "function") select = selector_default(select);
		for (var groups = this._groups, m = groups.length, subgroups = new Array(m), j = 0; j < m; ++j) for (var group = groups[j], n = group.length, subgroup = subgroups[j] = new Array(n), node, subnode, i = 0; i < n; ++i) if ((node = group[i]) && (subnode = select.call(node, node.__data__, i, group))) {
			if ("__data__" in node) subnode.__data__ = node.__data__;
			subgroup[i] = subnode;
		}
		return new Selection$1(subgroups, this._parents);
	}

//#endregion
//#region node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/array.js
	function array(x) {
		return x == null ? [] : Array.isArray(x) ? x : Array.from(x);
	}

//#endregion
//#region node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selectorAll.js
	function empty() {
		return [];
	}
	function selectorAll_default(selector) {
		return selector == null ? empty : function() {
			return this.querySelectorAll(selector);
		};
	}

//#endregion
//#region node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/selectAll.js
	function arrayAll(select) {
		return function() {
			return array(select.apply(this, arguments));
		};
	}
	function selectAll_default$1(select) {
		if (typeof select === "function") select = arrayAll(select);
		else select = selectorAll_default(select);
		for (var groups = this._groups, m = groups.length, subgroups = [], parents = [], j = 0; j < m; ++j) for (var group = groups[j], n = group.length, node, i = 0; i < n; ++i) if (node = group[i]) {
			subgroups.push(select.call(node, node.__data__, i, group));
			parents.push(node);
		}
		return new Selection$1(subgroups, parents);
	}

//#endregion
//#region node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/matcher.js
	function matcher_default(selector) {
		return function() {
			return this.matches(selector);
		};
	}
	function childMatcher(selector) {
		return function(node) {
			return node.matches(selector);
		};
	}

//#endregion
//#region node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/selectChild.js
	var find$1 = Array.prototype.find;
	function childFind(match) {
		return function() {
			return find$1.call(this.children, match);
		};
	}
	function childFirst() {
		return this.firstElementChild;
	}
	function selectChild_default(match) {
		return this.select(match == null ? childFirst : childFind(typeof match === "function" ? match : childMatcher(match)));
	}

//#endregion
//#region node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/selectChildren.js
	var filter = Array.prototype.filter;
	function children() {
		return Array.from(this.children);
	}
	function childrenFilter(match) {
		return function() {
			return filter.call(this.children, match);
		};
	}
	function selectChildren_default(match) {
		return this.selectAll(match == null ? children : childrenFilter(typeof match === "function" ? match : childMatcher(match)));
	}

//#endregion
//#region node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/filter.js
	function filter_default$1(match) {
		if (typeof match !== "function") match = matcher_default(match);
		for (var groups = this._groups, m = groups.length, subgroups = new Array(m), j = 0; j < m; ++j) for (var group = groups[j], n = group.length, subgroup = subgroups[j] = [], node, i = 0; i < n; ++i) if ((node = group[i]) && match.call(node, node.__data__, i, group)) subgroup.push(node);
		return new Selection$1(subgroups, this._parents);
	}

//#endregion
//#region node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/sparse.js
	function sparse_default(update) {
		return new Array(update.length);
	}

//#endregion
//#region node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/enter.js
	function enter_default() {
		return new Selection$1(this._enter || this._groups.map(sparse_default), this._parents);
	}
	function EnterNode(parent, datum) {
		this.ownerDocument = parent.ownerDocument;
		this.namespaceURI = parent.namespaceURI;
		this._next = null;
		this._parent = parent;
		this.__data__ = datum;
	}
	EnterNode.prototype = {
		constructor: EnterNode,
		appendChild: function(child) {
			return this._parent.insertBefore(child, this._next);
		},
		insertBefore: function(child, next) {
			return this._parent.insertBefore(child, next);
		},
		querySelector: function(selector) {
			return this._parent.querySelector(selector);
		},
		querySelectorAll: function(selector) {
			return this._parent.querySelectorAll(selector);
		}
	};

//#endregion
//#region node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/constant.js
	function constant_default$3(x) {
		return function() {
			return x;
		};
	}

//#endregion
//#region node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/data.js
	function bindIndex(parent, group, enter, update, exit, data) {
		var i = 0, node, groupLength = group.length, dataLength = data.length;
		for (; i < dataLength; ++i) if (node = group[i]) {
			node.__data__ = data[i];
			update[i] = node;
		} else enter[i] = new EnterNode(parent, data[i]);
		for (; i < groupLength; ++i) if (node = group[i]) exit[i] = node;
	}
	function bindKey(parent, group, enter, update, exit, data, key) {
		var i, node, nodeByKeyValue = /* @__PURE__ */ new Map(), groupLength = group.length, dataLength = data.length, keyValues = new Array(groupLength), keyValue;
		for (i = 0; i < groupLength; ++i) if (node = group[i]) {
			keyValues[i] = keyValue = key.call(node, node.__data__, i, group) + "";
			if (nodeByKeyValue.has(keyValue)) exit[i] = node;
			else nodeByKeyValue.set(keyValue, node);
		}
		for (i = 0; i < dataLength; ++i) {
			keyValue = key.call(parent, data[i], i, data) + "";
			if (node = nodeByKeyValue.get(keyValue)) {
				update[i] = node;
				node.__data__ = data[i];
				nodeByKeyValue.delete(keyValue);
			} else enter[i] = new EnterNode(parent, data[i]);
		}
		for (i = 0; i < groupLength; ++i) if ((node = group[i]) && nodeByKeyValue.get(keyValues[i]) === node) exit[i] = node;
	}
	function datum(node) {
		return node.__data__;
	}
	function data_default$1(value, key) {
		if (!arguments.length) return Array.from(this, datum);
		var bind = key ? bindKey : bindIndex, parents = this._parents, groups = this._groups;
		if (typeof value !== "function") value = constant_default$3(value);
		for (var m = groups.length, update = new Array(m), enter = new Array(m), exit = new Array(m), j = 0; j < m; ++j) {
			var parent = parents[j], group = groups[j], groupLength = group.length, data = arraylike(value.call(parent, parent && parent.__data__, j, parents)), dataLength = data.length, enterGroup = enter[j] = new Array(dataLength), updateGroup = update[j] = new Array(dataLength);
			bind(parent, group, enterGroup, updateGroup, exit[j] = new Array(groupLength), data, key);
			for (var i0 = 0, i1 = 0, previous, next; i0 < dataLength; ++i0) if (previous = enterGroup[i0]) {
				if (i0 >= i1) i1 = i0 + 1;
				while (!(next = updateGroup[i1]) && ++i1 < dataLength);
				previous._next = next || null;
			}
		}
		update = new Selection$1(update, parents);
		update._enter = enter;
		update._exit = exit;
		return update;
	}
	function arraylike(data) {
		return typeof data === "object" && "length" in data ? data : Array.from(data);
	}

//#endregion
//#region node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/exit.js
	function exit_default() {
		return new Selection$1(this._exit || this._groups.map(sparse_default), this._parents);
	}

//#endregion
//#region node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/join.js
	function join_default(onenter, onupdate, onexit) {
		var enter = this.enter(), update = this, exit = this.exit();
		if (typeof onenter === "function") {
			enter = onenter(enter);
			if (enter) enter = enter.selection();
		} else enter = enter.append(onenter + "");
		if (onupdate != null) {
			update = onupdate(update);
			if (update) update = update.selection();
		}
		if (onexit == null) exit.remove();
		else onexit(exit);
		return enter && update ? enter.merge(update).order() : update;
	}

//#endregion
//#region node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/merge.js
	function merge_default$1(context) {
		var selection = context.selection ? context.selection() : context;
		for (var groups0 = this._groups, groups1 = selection._groups, m0 = groups0.length, m1 = groups1.length, m = Math.min(m0, m1), merges = new Array(m0), j = 0; j < m; ++j) for (var group0 = groups0[j], group1 = groups1[j], n = group0.length, merge = merges[j] = new Array(n), node, i = 0; i < n; ++i) if (node = group0[i] || group1[i]) merge[i] = node;
		for (; j < m0; ++j) merges[j] = groups0[j];
		return new Selection$1(merges, this._parents);
	}

//#endregion
//#region node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/order.js
	function order_default() {
		for (var groups = this._groups, j = -1, m = groups.length; ++j < m;) for (var group = groups[j], i = group.length - 1, next = group[i], node; --i >= 0;) if (node = group[i]) {
			if (next && node.compareDocumentPosition(next) ^ 4) next.parentNode.insertBefore(node, next);
			next = node;
		}
		return this;
	}

//#endregion
//#region node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/sort.js
	function sort_default(compare) {
		if (!compare) compare = ascending;
		function compareNode(a, b) {
			return a && b ? compare(a.__data__, b.__data__) : !a - !b;
		}
		for (var groups = this._groups, m = groups.length, sortgroups = new Array(m), j = 0; j < m; ++j) {
			for (var group = groups[j], n = group.length, sortgroup = sortgroups[j] = new Array(n), node, i = 0; i < n; ++i) if (node = group[i]) sortgroup[i] = node;
			sortgroup.sort(compareNode);
		}
		return new Selection$1(sortgroups, this._parents).order();
	}
	function ascending(a, b) {
		return a < b ? -1 : a > b ? 1 : a >= b ? 0 : NaN;
	}

//#endregion
//#region node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/call.js
	function call_default() {
		var callback = arguments[0];
		arguments[0] = this;
		callback.apply(null, arguments);
		return this;
	}

//#endregion
//#region node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/nodes.js
	function nodes_default() {
		return Array.from(this);
	}

//#endregion
//#region node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/node.js
	function node_default() {
		for (var groups = this._groups, j = 0, m = groups.length; j < m; ++j) for (var group = groups[j], i = 0, n = group.length; i < n; ++i) {
			var node = group[i];
			if (node) return node;
		}
		return null;
	}

//#endregion
//#region node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/size.js
	function size_default$1() {
		let size = 0;
		for (const node of this) ++size;
		return size;
	}

//#endregion
//#region node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/empty.js
	function empty_default() {
		return !this.node();
	}

//#endregion
//#region node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/each.js
	function each_default(callback) {
		for (var groups = this._groups, j = 0, m = groups.length; j < m; ++j) for (var group = groups[j], i = 0, n = group.length, node; i < n; ++i) if (node = group[i]) callback.call(node, node.__data__, i, group);
		return this;
	}

//#endregion
//#region node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/attr.js
	function attrRemove$1(name) {
		return function() {
			this.removeAttribute(name);
		};
	}
	function attrRemoveNS$1(fullname) {
		return function() {
			this.removeAttributeNS(fullname.space, fullname.local);
		};
	}
	function attrConstant$1(name, value) {
		return function() {
			this.setAttribute(name, value);
		};
	}
	function attrConstantNS$1(fullname, value) {
		return function() {
			this.setAttributeNS(fullname.space, fullname.local, value);
		};
	}
	function attrFunction$1(name, value) {
		return function() {
			var v = value.apply(this, arguments);
			if (v == null) this.removeAttribute(name);
			else this.setAttribute(name, v);
		};
	}
	function attrFunctionNS$1(fullname, value) {
		return function() {
			var v = value.apply(this, arguments);
			if (v == null) this.removeAttributeNS(fullname.space, fullname.local);
			else this.setAttributeNS(fullname.space, fullname.local, v);
		};
	}
	function attr_default$1(name, value) {
		var fullname = namespace_default(name);
		if (arguments.length < 2) {
			var node = this.node();
			return fullname.local ? node.getAttributeNS(fullname.space, fullname.local) : node.getAttribute(fullname);
		}
		return this.each((value == null ? fullname.local ? attrRemoveNS$1 : attrRemove$1 : typeof value === "function" ? fullname.local ? attrFunctionNS$1 : attrFunction$1 : fullname.local ? attrConstantNS$1 : attrConstant$1)(fullname, value));
	}

//#endregion
//#region node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/window.js
	function window_default(node) {
		return node.ownerDocument && node.ownerDocument.defaultView || node.document && node || node.defaultView;
	}

//#endregion
//#region node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/style.js
	function styleRemove$1(name) {
		return function() {
			this.style.removeProperty(name);
		};
	}
	function styleConstant$1(name, value, priority) {
		return function() {
			this.style.setProperty(name, value, priority);
		};
	}
	function styleFunction$1(name, value, priority) {
		return function() {
			var v = value.apply(this, arguments);
			if (v == null) this.style.removeProperty(name);
			else this.style.setProperty(name, v, priority);
		};
	}
	function style_default$1(name, value, priority) {
		return arguments.length > 1 ? this.each((value == null ? styleRemove$1 : typeof value === "function" ? styleFunction$1 : styleConstant$1)(name, value, priority == null ? "" : priority)) : styleValue(this.node(), name);
	}
	function styleValue(node, name) {
		return node.style.getPropertyValue(name) || window_default(node).getComputedStyle(node, null).getPropertyValue(name);
	}

//#endregion
//#region node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/property.js
	function propertyRemove(name) {
		return function() {
			delete this[name];
		};
	}
	function propertyConstant(name, value) {
		return function() {
			this[name] = value;
		};
	}
	function propertyFunction(name, value) {
		return function() {
			var v = value.apply(this, arguments);
			if (v == null) delete this[name];
			else this[name] = v;
		};
	}
	function property_default(name, value) {
		return arguments.length > 1 ? this.each((value == null ? propertyRemove : typeof value === "function" ? propertyFunction : propertyConstant)(name, value)) : this.node()[name];
	}

//#endregion
//#region node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/classed.js
	function classArray(string) {
		return string.trim().split(/^|\s+/);
	}
	function classList(node) {
		return node.classList || new ClassList(node);
	}
	function ClassList(node) {
		this._node = node;
		this._names = classArray(node.getAttribute("class") || "");
	}
	ClassList.prototype = {
		add: function(name) {
			if (this._names.indexOf(name) < 0) {
				this._names.push(name);
				this._node.setAttribute("class", this._names.join(" "));
			}
		},
		remove: function(name) {
			var i = this._names.indexOf(name);
			if (i >= 0) {
				this._names.splice(i, 1);
				this._node.setAttribute("class", this._names.join(" "));
			}
		},
		contains: function(name) {
			return this._names.indexOf(name) >= 0;
		}
	};
	function classedAdd(node, names) {
		var list = classList(node), i = -1, n = names.length;
		while (++i < n) list.add(names[i]);
	}
	function classedRemove(node, names) {
		var list = classList(node), i = -1, n = names.length;
		while (++i < n) list.remove(names[i]);
	}
	function classedTrue(names) {
		return function() {
			classedAdd(this, names);
		};
	}
	function classedFalse(names) {
		return function() {
			classedRemove(this, names);
		};
	}
	function classedFunction(names, value) {
		return function() {
			(value.apply(this, arguments) ? classedAdd : classedRemove)(this, names);
		};
	}
	function classed_default(name, value) {
		var names = classArray(name + "");
		if (arguments.length < 2) {
			var list = classList(this.node()), i = -1, n = names.length;
			while (++i < n) if (!list.contains(names[i])) return false;
			return true;
		}
		return this.each((typeof value === "function" ? classedFunction : value ? classedTrue : classedFalse)(names, value));
	}

//#endregion
//#region node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/text.js
	function textRemove() {
		this.textContent = "";
	}
	function textConstant$1(value) {
		return function() {
			this.textContent = value;
		};
	}
	function textFunction$1(value) {
		return function() {
			var v = value.apply(this, arguments);
			this.textContent = v == null ? "" : v;
		};
	}
	function text_default$1(value) {
		return arguments.length ? this.each(value == null ? textRemove : (typeof value === "function" ? textFunction$1 : textConstant$1)(value)) : this.node().textContent;
	}

//#endregion
//#region node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/html.js
	function htmlRemove() {
		this.innerHTML = "";
	}
	function htmlConstant(value) {
		return function() {
			this.innerHTML = value;
		};
	}
	function htmlFunction(value) {
		return function() {
			var v = value.apply(this, arguments);
			this.innerHTML = v == null ? "" : v;
		};
	}
	function html_default(value) {
		return arguments.length ? this.each(value == null ? htmlRemove : (typeof value === "function" ? htmlFunction : htmlConstant)(value)) : this.node().innerHTML;
	}

//#endregion
//#region node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/raise.js
	function raise() {
		if (this.nextSibling) this.parentNode.appendChild(this);
	}
	function raise_default() {
		return this.each(raise);
	}

//#endregion
//#region node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/lower.js
	function lower() {
		if (this.previousSibling) this.parentNode.insertBefore(this, this.parentNode.firstChild);
	}
	function lower_default() {
		return this.each(lower);
	}

//#endregion
//#region node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/append.js
	function append_default(name) {
		var create = typeof name === "function" ? name : creator_default(name);
		return this.select(function() {
			return this.appendChild(create.apply(this, arguments));
		});
	}

//#endregion
//#region node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/insert.js
	function constantNull() {
		return null;
	}
	function insert_default(name, before) {
		var create = typeof name === "function" ? name : creator_default(name), select = before == null ? constantNull : typeof before === "function" ? before : selector_default(before);
		return this.select(function() {
			return this.insertBefore(create.apply(this, arguments), select.apply(this, arguments) || null);
		});
	}

//#endregion
//#region node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/remove.js
	function remove() {
		var parent = this.parentNode;
		if (parent) parent.removeChild(this);
	}
	function remove_default$2() {
		return this.each(remove);
	}

//#endregion
//#region node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/clone.js
	function selection_cloneShallow() {
		var clone = this.cloneNode(false), parent = this.parentNode;
		return parent ? parent.insertBefore(clone, this.nextSibling) : clone;
	}
	function selection_cloneDeep() {
		var clone = this.cloneNode(true), parent = this.parentNode;
		return parent ? parent.insertBefore(clone, this.nextSibling) : clone;
	}
	function clone_default(deep) {
		return this.select(deep ? selection_cloneDeep : selection_cloneShallow);
	}

//#endregion
//#region node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/datum.js
	function datum_default(value) {
		return arguments.length ? this.property("__data__", value) : this.node().__data__;
	}

//#endregion
//#region node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/on.js
	function contextListener(listener) {
		return function(event) {
			listener.call(this, event, this.__data__);
		};
	}
	function parseTypenames(typenames) {
		return typenames.trim().split(/^|\s+/).map(function(t) {
			var name = "", i = t.indexOf(".");
			if (i >= 0) name = t.slice(i + 1), t = t.slice(0, i);
			return {
				type: t,
				name
			};
		});
	}
	function onRemove(typename) {
		return function() {
			var on = this.__on;
			if (!on) return;
			for (var j = 0, i = -1, m = on.length, o; j < m; ++j) if (o = on[j], (!typename.type || o.type === typename.type) && o.name === typename.name) this.removeEventListener(o.type, o.listener, o.options);
			else on[++i] = o;
			if (++i) on.length = i;
			else delete this.__on;
		};
	}
	function onAdd(typename, value, options) {
		return function() {
			var on = this.__on, o, listener = contextListener(value);
			if (on) {
				for (var j = 0, m = on.length; j < m; ++j) if ((o = on[j]).type === typename.type && o.name === typename.name) {
					this.removeEventListener(o.type, o.listener, o.options);
					this.addEventListener(o.type, o.listener = listener, o.options = options);
					o.value = value;
					return;
				}
			}
			this.addEventListener(typename.type, listener, options);
			o = {
				type: typename.type,
				name: typename.name,
				value,
				listener,
				options
			};
			if (!on) this.__on = [o];
			else on.push(o);
		};
	}
	function on_default$1(typename, value, options) {
		var typenames = parseTypenames(typename + ""), i, n = typenames.length, t;
		if (arguments.length < 2) {
			var on = this.node().__on;
			if (on) {
				for (var j = 0, m = on.length, o; j < m; ++j) for (i = 0, o = on[j]; i < n; ++i) if ((t = typenames[i]).type === o.type && t.name === o.name) return o.value;
			}
			return;
		}
		on = value ? onAdd : onRemove;
		for (i = 0; i < n; ++i) this.each(on(typenames[i], value, options));
		return this;
	}

//#endregion
//#region node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/dispatch.js
	function dispatchEvent(node, type, params) {
		var window = window_default(node), event = window.CustomEvent;
		if (typeof event === "function") event = new event(type, params);
		else {
			event = window.document.createEvent("Event");
			if (params) event.initEvent(type, params.bubbles, params.cancelable), event.detail = params.detail;
			else event.initEvent(type, false, false);
		}
		node.dispatchEvent(event);
	}
	function dispatchConstant(type, params) {
		return function() {
			return dispatchEvent(this, type, params);
		};
	}
	function dispatchFunction(type, params) {
		return function() {
			return dispatchEvent(this, type, params.apply(this, arguments));
		};
	}
	function dispatch_default(type, params) {
		return this.each((typeof params === "function" ? dispatchFunction : dispatchConstant)(type, params));
	}

//#endregion
//#region node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/iterator.js
	function* iterator_default() {
		for (var groups = this._groups, j = 0, m = groups.length; j < m; ++j) for (var group = groups[j], i = 0, n = group.length, node; i < n; ++i) if (node = group[i]) yield node;
	}

//#endregion
//#region node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/index.js
	var root = [null];
	function Selection$1(groups, parents) {
		this._groups = groups;
		this._parents = parents;
	}
	function selection() {
		return new Selection$1([[document.documentElement]], root);
	}
	function selection_selection() {
		return this;
	}
	Selection$1.prototype = selection.prototype = {
		constructor: Selection$1,
		select: select_default$2,
		selectAll: selectAll_default$1,
		selectChild: selectChild_default,
		selectChildren: selectChildren_default,
		filter: filter_default$1,
		data: data_default$1,
		enter: enter_default,
		exit: exit_default,
		join: join_default,
		merge: merge_default$1,
		selection: selection_selection,
		order: order_default,
		sort: sort_default,
		call: call_default,
		nodes: nodes_default,
		node: node_default,
		size: size_default$1,
		empty: empty_default,
		each: each_default,
		attr: attr_default$1,
		style: style_default$1,
		property: property_default,
		classed: classed_default,
		text: text_default$1,
		html: html_default,
		raise: raise_default,
		lower: lower_default,
		append: append_default,
		insert: insert_default,
		remove: remove_default$2,
		clone: clone_default,
		datum: datum_default,
		on: on_default$1,
		dispatch: dispatch_default,
		[Symbol.iterator]: iterator_default
	};

//#endregion
//#region node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/select.js
	function select_default$1(selector) {
		return typeof selector === "string" ? new Selection$1([[document.querySelector(selector)]], [document.documentElement]) : new Selection$1([[selector]], root);
	}

//#endregion
//#region node_modules/.pnpm/d3-color@3.1.0/node_modules/d3-color/src/define.js
	function define_default(constructor, factory, prototype) {
		constructor.prototype = factory.prototype = prototype;
		prototype.constructor = constructor;
	}
	function extend(parent, definition) {
		var prototype = Object.create(parent.prototype);
		for (var key in definition) prototype[key] = definition[key];
		return prototype;
	}

//#endregion
//#region node_modules/.pnpm/d3-color@3.1.0/node_modules/d3-color/src/color.js
	function Color() {}
	var darker = .7;
	var brighter = 1 / darker;
	var reI = "\\s*([+-]?\\d+)\\s*", reN = "\\s*([+-]?(?:\\d*\\.)?\\d+(?:[eE][+-]?\\d+)?)\\s*", reP = "\\s*([+-]?(?:\\d*\\.)?\\d+(?:[eE][+-]?\\d+)?)%\\s*", reHex = /^#([0-9a-f]{3,8})$/, reRgbInteger = new RegExp(`^rgb\\(${reI},${reI},${reI}\\)$`), reRgbPercent = new RegExp(`^rgb\\(${reP},${reP},${reP}\\)$`), reRgbaInteger = new RegExp(`^rgba\\(${reI},${reI},${reI},${reN}\\)$`), reRgbaPercent = new RegExp(`^rgba\\(${reP},${reP},${reP},${reN}\\)$`), reHslPercent = new RegExp(`^hsl\\(${reN},${reP},${reP}\\)$`), reHslaPercent = new RegExp(`^hsla\\(${reN},${reP},${reP},${reN}\\)$`);
	var named = {
		aliceblue: 15792383,
		antiquewhite: 16444375,
		aqua: 65535,
		aquamarine: 8388564,
		azure: 15794175,
		beige: 16119260,
		bisque: 16770244,
		black: 0,
		blanchedalmond: 16772045,
		blue: 255,
		blueviolet: 9055202,
		brown: 10824234,
		burlywood: 14596231,
		cadetblue: 6266528,
		chartreuse: 8388352,
		chocolate: 13789470,
		coral: 16744272,
		cornflowerblue: 6591981,
		cornsilk: 16775388,
		crimson: 14423100,
		cyan: 65535,
		darkblue: 139,
		darkcyan: 35723,
		darkgoldenrod: 12092939,
		darkgray: 11119017,
		darkgreen: 25600,
		darkgrey: 11119017,
		darkkhaki: 12433259,
		darkmagenta: 9109643,
		darkolivegreen: 5597999,
		darkorange: 16747520,
		darkorchid: 10040012,
		darkred: 9109504,
		darksalmon: 15308410,
		darkseagreen: 9419919,
		darkslateblue: 4734347,
		darkslategray: 3100495,
		darkslategrey: 3100495,
		darkturquoise: 52945,
		darkviolet: 9699539,
		deeppink: 16716947,
		deepskyblue: 49151,
		dimgray: 6908265,
		dimgrey: 6908265,
		dodgerblue: 2003199,
		firebrick: 11674146,
		floralwhite: 16775920,
		forestgreen: 2263842,
		fuchsia: 16711935,
		gainsboro: 14474460,
		ghostwhite: 16316671,
		gold: 16766720,
		goldenrod: 14329120,
		gray: 8421504,
		green: 32768,
		greenyellow: 11403055,
		grey: 8421504,
		honeydew: 15794160,
		hotpink: 16738740,
		indianred: 13458524,
		indigo: 4915330,
		ivory: 16777200,
		khaki: 15787660,
		lavender: 15132410,
		lavenderblush: 16773365,
		lawngreen: 8190976,
		lemonchiffon: 16775885,
		lightblue: 11393254,
		lightcoral: 15761536,
		lightcyan: 14745599,
		lightgoldenrodyellow: 16448210,
		lightgray: 13882323,
		lightgreen: 9498256,
		lightgrey: 13882323,
		lightpink: 16758465,
		lightsalmon: 16752762,
		lightseagreen: 2142890,
		lightskyblue: 8900346,
		lightslategray: 7833753,
		lightslategrey: 7833753,
		lightsteelblue: 11584734,
		lightyellow: 16777184,
		lime: 65280,
		limegreen: 3329330,
		linen: 16445670,
		magenta: 16711935,
		maroon: 8388608,
		mediumaquamarine: 6737322,
		mediumblue: 205,
		mediumorchid: 12211667,
		mediumpurple: 9662683,
		mediumseagreen: 3978097,
		mediumslateblue: 8087790,
		mediumspringgreen: 64154,
		mediumturquoise: 4772300,
		mediumvioletred: 13047173,
		midnightblue: 1644912,
		mintcream: 16121850,
		mistyrose: 16770273,
		moccasin: 16770229,
		navajowhite: 16768685,
		navy: 128,
		oldlace: 16643558,
		olive: 8421376,
		olivedrab: 7048739,
		orange: 16753920,
		orangered: 16729344,
		orchid: 14315734,
		palegoldenrod: 15657130,
		palegreen: 10025880,
		paleturquoise: 11529966,
		palevioletred: 14381203,
		papayawhip: 16773077,
		peachpuff: 16767673,
		peru: 13468991,
		pink: 16761035,
		plum: 14524637,
		powderblue: 11591910,
		purple: 8388736,
		rebeccapurple: 6697881,
		red: 16711680,
		rosybrown: 12357519,
		royalblue: 4286945,
		saddlebrown: 9127187,
		salmon: 16416882,
		sandybrown: 16032864,
		seagreen: 3050327,
		seashell: 16774638,
		sienna: 10506797,
		silver: 12632256,
		skyblue: 8900331,
		slateblue: 6970061,
		slategray: 7372944,
		slategrey: 7372944,
		snow: 16775930,
		springgreen: 65407,
		steelblue: 4620980,
		tan: 13808780,
		teal: 32896,
		thistle: 14204888,
		tomato: 16737095,
		turquoise: 4251856,
		violet: 15631086,
		wheat: 16113331,
		white: 16777215,
		whitesmoke: 16119285,
		yellow: 16776960,
		yellowgreen: 10145074
	};
	define_default(Color, color, {
		copy(channels) {
			return Object.assign(new this.constructor(), this, channels);
		},
		displayable() {
			return this.rgb().displayable();
		},
		hex: color_formatHex,
		formatHex: color_formatHex,
		formatHex8: color_formatHex8,
		formatHsl: color_formatHsl,
		formatRgb: color_formatRgb,
		toString: color_formatRgb
	});
	function color_formatHex() {
		return this.rgb().formatHex();
	}
	function color_formatHex8() {
		return this.rgb().formatHex8();
	}
	function color_formatHsl() {
		return hslConvert(this).formatHsl();
	}
	function color_formatRgb() {
		return this.rgb().formatRgb();
	}
	function color(format) {
		var m, l;
		format = (format + "").trim().toLowerCase();
		return (m = reHex.exec(format)) ? (l = m[1].length, m = parseInt(m[1], 16), l === 6 ? rgbn(m) : l === 3 ? new Rgb(m >> 8 & 15 | m >> 4 & 240, m >> 4 & 15 | m & 240, (m & 15) << 4 | m & 15, 1) : l === 8 ? rgba(m >> 24 & 255, m >> 16 & 255, m >> 8 & 255, (m & 255) / 255) : l === 4 ? rgba(m >> 12 & 15 | m >> 8 & 240, m >> 8 & 15 | m >> 4 & 240, m >> 4 & 15 | m & 240, ((m & 15) << 4 | m & 15) / 255) : null) : (m = reRgbInteger.exec(format)) ? new Rgb(m[1], m[2], m[3], 1) : (m = reRgbPercent.exec(format)) ? new Rgb(m[1] * 255 / 100, m[2] * 255 / 100, m[3] * 255 / 100, 1) : (m = reRgbaInteger.exec(format)) ? rgba(m[1], m[2], m[3], m[4]) : (m = reRgbaPercent.exec(format)) ? rgba(m[1] * 255 / 100, m[2] * 255 / 100, m[3] * 255 / 100, m[4]) : (m = reHslPercent.exec(format)) ? hsla(m[1], m[2] / 100, m[3] / 100, 1) : (m = reHslaPercent.exec(format)) ? hsla(m[1], m[2] / 100, m[3] / 100, m[4]) : named.hasOwnProperty(format) ? rgbn(named[format]) : format === "transparent" ? new Rgb(NaN, NaN, NaN, 0) : null;
	}
	function rgbn(n) {
		return new Rgb(n >> 16 & 255, n >> 8 & 255, n & 255, 1);
	}
	function rgba(r, g, b, a) {
		if (a <= 0) r = g = b = NaN;
		return new Rgb(r, g, b, a);
	}
	function rgbConvert(o) {
		if (!(o instanceof Color)) o = color(o);
		if (!o) return new Rgb();
		o = o.rgb();
		return new Rgb(o.r, o.g, o.b, o.opacity);
	}
	function rgb(r, g, b, opacity) {
		return arguments.length === 1 ? rgbConvert(r) : new Rgb(r, g, b, opacity == null ? 1 : opacity);
	}
	function Rgb(r, g, b, opacity) {
		this.r = +r;
		this.g = +g;
		this.b = +b;
		this.opacity = +opacity;
	}
	define_default(Rgb, rgb, extend(Color, {
		brighter(k) {
			k = k == null ? brighter : Math.pow(brighter, k);
			return new Rgb(this.r * k, this.g * k, this.b * k, this.opacity);
		},
		darker(k) {
			k = k == null ? darker : Math.pow(darker, k);
			return new Rgb(this.r * k, this.g * k, this.b * k, this.opacity);
		},
		rgb() {
			return this;
		},
		clamp() {
			return new Rgb(clampi(this.r), clampi(this.g), clampi(this.b), clampa(this.opacity));
		},
		displayable() {
			return -.5 <= this.r && this.r < 255.5 && -.5 <= this.g && this.g < 255.5 && -.5 <= this.b && this.b < 255.5 && 0 <= this.opacity && this.opacity <= 1;
		},
		hex: rgb_formatHex,
		formatHex: rgb_formatHex,
		formatHex8: rgb_formatHex8,
		formatRgb: rgb_formatRgb,
		toString: rgb_formatRgb
	}));
	function rgb_formatHex() {
		return `#${hex(this.r)}${hex(this.g)}${hex(this.b)}`;
	}
	function rgb_formatHex8() {
		return `#${hex(this.r)}${hex(this.g)}${hex(this.b)}${hex((isNaN(this.opacity) ? 1 : this.opacity) * 255)}`;
	}
	function rgb_formatRgb() {
		const a = clampa(this.opacity);
		return `${a === 1 ? "rgb(" : "rgba("}${clampi(this.r)}, ${clampi(this.g)}, ${clampi(this.b)}${a === 1 ? ")" : `, ${a})`}`;
	}
	function clampa(opacity) {
		return isNaN(opacity) ? 1 : Math.max(0, Math.min(1, opacity));
	}
	function clampi(value) {
		return Math.max(0, Math.min(255, Math.round(value) || 0));
	}
	function hex(value) {
		value = clampi(value);
		return (value < 16 ? "0" : "") + value.toString(16);
	}
	function hsla(h, s, l, a) {
		if (a <= 0) h = s = l = NaN;
		else if (l <= 0 || l >= 1) h = s = NaN;
		else if (s <= 0) h = NaN;
		return new Hsl(h, s, l, a);
	}
	function hslConvert(o) {
		if (o instanceof Hsl) return new Hsl(o.h, o.s, o.l, o.opacity);
		if (!(o instanceof Color)) o = color(o);
		if (!o) return new Hsl();
		if (o instanceof Hsl) return o;
		o = o.rgb();
		var r = o.r / 255, g = o.g / 255, b = o.b / 255, min = Math.min(r, g, b), max = Math.max(r, g, b), h = NaN, s = max - min, l = (max + min) / 2;
		if (s) {
			if (r === max) h = (g - b) / s + (g < b) * 6;
			else if (g === max) h = (b - r) / s + 2;
			else h = (r - g) / s + 4;
			s /= l < .5 ? max + min : 2 - max - min;
			h *= 60;
		} else s = l > 0 && l < 1 ? 0 : h;
		return new Hsl(h, s, l, o.opacity);
	}
	function hsl(h, s, l, opacity) {
		return arguments.length === 1 ? hslConvert(h) : new Hsl(h, s, l, opacity == null ? 1 : opacity);
	}
	function Hsl(h, s, l, opacity) {
		this.h = +h;
		this.s = +s;
		this.l = +l;
		this.opacity = +opacity;
	}
	define_default(Hsl, hsl, extend(Color, {
		brighter(k) {
			k = k == null ? brighter : Math.pow(brighter, k);
			return new Hsl(this.h, this.s, this.l * k, this.opacity);
		},
		darker(k) {
			k = k == null ? darker : Math.pow(darker, k);
			return new Hsl(this.h, this.s, this.l * k, this.opacity);
		},
		rgb() {
			var h = this.h % 360 + (this.h < 0) * 360, s = isNaN(h) || isNaN(this.s) ? 0 : this.s, l = this.l, m2 = l + (l < .5 ? l : 1 - l) * s, m1 = 2 * l - m2;
			return new Rgb(hsl2rgb(h >= 240 ? h - 240 : h + 120, m1, m2), hsl2rgb(h, m1, m2), hsl2rgb(h < 120 ? h + 240 : h - 120, m1, m2), this.opacity);
		},
		clamp() {
			return new Hsl(clamph(this.h), clampt(this.s), clampt(this.l), clampa(this.opacity));
		},
		displayable() {
			return (0 <= this.s && this.s <= 1 || isNaN(this.s)) && 0 <= this.l && this.l <= 1 && 0 <= this.opacity && this.opacity <= 1;
		},
		formatHsl() {
			const a = clampa(this.opacity);
			return `${a === 1 ? "hsl(" : "hsla("}${clamph(this.h)}, ${clampt(this.s) * 100}%, ${clampt(this.l) * 100}%${a === 1 ? ")" : `, ${a})`}`;
		}
	}));
	function clamph(value) {
		value = (value || 0) % 360;
		return value < 0 ? value + 360 : value;
	}
	function clampt(value) {
		return Math.max(0, Math.min(1, value || 0));
	}
	function hsl2rgb(h, m1, m2) {
		return (h < 60 ? m1 + (m2 - m1) * h / 60 : h < 180 ? m2 : h < 240 ? m1 + (m2 - m1) * (240 - h) / 60 : m1) * 255;
	}

//#endregion
//#region node_modules/.pnpm/d3-interpolate@3.0.1/node_modules/d3-interpolate/src/basis.js
	function basis(t1, v0, v1, v2, v3) {
		var t2 = t1 * t1, t3 = t2 * t1;
		return ((1 - 3 * t1 + 3 * t2 - t3) * v0 + (4 - 6 * t2 + 3 * t3) * v1 + (1 + 3 * t1 + 3 * t2 - 3 * t3) * v2 + t3 * v3) / 6;
	}
	function basis_default(values) {
		var n = values.length - 1;
		return function(t) {
			var i = t <= 0 ? t = 0 : t >= 1 ? (t = 1, n - 1) : Math.floor(t * n), v1 = values[i], v2 = values[i + 1], v0 = i > 0 ? values[i - 1] : 2 * v1 - v2, v3 = i < n - 1 ? values[i + 2] : 2 * v2 - v1;
			return basis((t - i / n) * n, v0, v1, v2, v3);
		};
	}

//#endregion
//#region node_modules/.pnpm/d3-interpolate@3.0.1/node_modules/d3-interpolate/src/basisClosed.js
	function basisClosed_default(values) {
		var n = values.length;
		return function(t) {
			var i = Math.floor(((t %= 1) < 0 ? ++t : t) * n), v0 = values[(i + n - 1) % n], v1 = values[i % n], v2 = values[(i + 1) % n], v3 = values[(i + 2) % n];
			return basis((t - i / n) * n, v0, v1, v2, v3);
		};
	}

//#endregion
//#region node_modules/.pnpm/d3-interpolate@3.0.1/node_modules/d3-interpolate/src/constant.js
	var constant_default$2 = (x) => () => x;

//#endregion
//#region node_modules/.pnpm/d3-interpolate@3.0.1/node_modules/d3-interpolate/src/color.js
	function linear(a, d) {
		return function(t) {
			return a + t * d;
		};
	}
	function exponential(a, b, y) {
		return a = Math.pow(a, y), b = Math.pow(b, y) - a, y = 1 / y, function(t) {
			return Math.pow(a + t * b, y);
		};
	}
	function gamma(y) {
		return (y = +y) === 1 ? nogamma : function(a, b) {
			return b - a ? exponential(a, b, y) : constant_default$2(isNaN(a) ? b : a);
		};
	}
	function nogamma(a, b) {
		var d = b - a;
		return d ? linear(a, d) : constant_default$2(isNaN(a) ? b : a);
	}

//#endregion
//#region node_modules/.pnpm/d3-interpolate@3.0.1/node_modules/d3-interpolate/src/rgb.js
	var rgb_default = (function rgbGamma(y) {
		var color = gamma(y);
		function rgb$1(start, end) {
			var r = color((start = rgb(start)).r, (end = rgb(end)).r), g = color(start.g, end.g), b = color(start.b, end.b), opacity = nogamma(start.opacity, end.opacity);
			return function(t) {
				start.r = r(t);
				start.g = g(t);
				start.b = b(t);
				start.opacity = opacity(t);
				return start + "";
			};
		}
		rgb$1.gamma = rgbGamma;
		return rgb$1;
	})(1);
	function rgbSpline(spline) {
		return function(colors) {
			var n = colors.length, r = new Array(n), g = new Array(n), b = new Array(n), i, color;
			for (i = 0; i < n; ++i) {
				color = rgb(colors[i]);
				r[i] = color.r || 0;
				g[i] = color.g || 0;
				b[i] = color.b || 0;
			}
			r = spline(r);
			g = spline(g);
			b = spline(b);
			color.opacity = 1;
			return function(t) {
				color.r = r(t);
				color.g = g(t);
				color.b = b(t);
				return color + "";
			};
		};
	}
	var rgbBasis = rgbSpline(basis_default);
	var rgbBasisClosed = rgbSpline(basisClosed_default);

//#endregion
//#region node_modules/.pnpm/d3-interpolate@3.0.1/node_modules/d3-interpolate/src/number.js
	function number_default(a, b) {
		return a = +a, b = +b, function(t) {
			return a * (1 - t) + b * t;
		};
	}

//#endregion
//#region node_modules/.pnpm/d3-interpolate@3.0.1/node_modules/d3-interpolate/src/string.js
	var reA = /[-+]?(?:\d+\.?\d*|\.?\d+)(?:[eE][-+]?\d+)?/g, reB = new RegExp(reA.source, "g");
	function zero(b) {
		return function() {
			return b;
		};
	}
	function one(b) {
		return function(t) {
			return b(t) + "";
		};
	}
	function string_default(a, b) {
		var bi = reA.lastIndex = reB.lastIndex = 0, am, bm, bs, i = -1, s = [], q = [];
		a = a + "", b = b + "";
		while ((am = reA.exec(a)) && (bm = reB.exec(b))) {
			if ((bs = bm.index) > bi) {
				bs = b.slice(bi, bs);
				if (s[i]) s[i] += bs;
				else s[++i] = bs;
			}
			if ((am = am[0]) === (bm = bm[0])) if (s[i]) s[i] += bm;
			else s[++i] = bm;
			else {
				s[++i] = null;
				q.push({
					i,
					x: number_default(am, bm)
				});
			}
			bi = reB.lastIndex;
		}
		if (bi < b.length) {
			bs = b.slice(bi);
			if (s[i]) s[i] += bs;
			else s[++i] = bs;
		}
		return s.length < 2 ? q[0] ? one(q[0].x) : zero(b) : (b = q.length, function(t) {
			for (var i = 0, o; i < b; ++i) s[(o = q[i]).i] = o.x(t);
			return s.join("");
		});
	}

//#endregion
//#region node_modules/.pnpm/d3-interpolate@3.0.1/node_modules/d3-interpolate/src/transform/decompose.js
	var degrees = 180 / Math.PI;
	var identity$1 = {
		translateX: 0,
		translateY: 0,
		rotate: 0,
		skewX: 0,
		scaleX: 1,
		scaleY: 1
	};
	function decompose_default(a, b, c, d, e, f) {
		var scaleX, scaleY, skewX;
		if (scaleX = Math.sqrt(a * a + b * b)) a /= scaleX, b /= scaleX;
		if (skewX = a * c + b * d) c -= a * skewX, d -= b * skewX;
		if (scaleY = Math.sqrt(c * c + d * d)) c /= scaleY, d /= scaleY, skewX /= scaleY;
		if (a * d < b * c) a = -a, b = -b, skewX = -skewX, scaleX = -scaleX;
		return {
			translateX: e,
			translateY: f,
			rotate: Math.atan2(b, a) * degrees,
			skewX: Math.atan(skewX) * degrees,
			scaleX,
			scaleY
		};
	}

//#endregion
//#region node_modules/.pnpm/d3-interpolate@3.0.1/node_modules/d3-interpolate/src/transform/parse.js
	var svgNode;
	function parseCss(value) {
		const m = new (typeof DOMMatrix === "function" ? DOMMatrix : WebKitCSSMatrix)(value + "");
		return m.isIdentity ? identity$1 : decompose_default(m.a, m.b, m.c, m.d, m.e, m.f);
	}
	function parseSvg(value) {
		if (value == null) return identity$1;
		if (!svgNode) svgNode = document.createElementNS("http://www.w3.org/2000/svg", "g");
		svgNode.setAttribute("transform", value);
		if (!(value = svgNode.transform.baseVal.consolidate())) return identity$1;
		value = value.matrix;
		return decompose_default(value.a, value.b, value.c, value.d, value.e, value.f);
	}

//#endregion
//#region node_modules/.pnpm/d3-interpolate@3.0.1/node_modules/d3-interpolate/src/transform/index.js
	function interpolateTransform(parse, pxComma, pxParen, degParen) {
		function pop(s) {
			return s.length ? s.pop() + " " : "";
		}
		function translate(xa, ya, xb, yb, s, q) {
			if (xa !== xb || ya !== yb) {
				var i = s.push("translate(", null, pxComma, null, pxParen);
				q.push({
					i: i - 4,
					x: number_default(xa, xb)
				}, {
					i: i - 2,
					x: number_default(ya, yb)
				});
			} else if (xb || yb) s.push("translate(" + xb + pxComma + yb + pxParen);
		}
		function rotate(a, b, s, q) {
			if (a !== b) {
				if (a - b > 180) b += 360;
				else if (b - a > 180) a += 360;
				q.push({
					i: s.push(pop(s) + "rotate(", null, degParen) - 2,
					x: number_default(a, b)
				});
			} else if (b) s.push(pop(s) + "rotate(" + b + degParen);
		}
		function skewX(a, b, s, q) {
			if (a !== b) q.push({
				i: s.push(pop(s) + "skewX(", null, degParen) - 2,
				x: number_default(a, b)
			});
			else if (b) s.push(pop(s) + "skewX(" + b + degParen);
		}
		function scale(xa, ya, xb, yb, s, q) {
			if (xa !== xb || ya !== yb) {
				var i = s.push(pop(s) + "scale(", null, ",", null, ")");
				q.push({
					i: i - 4,
					x: number_default(xa, xb)
				}, {
					i: i - 2,
					x: number_default(ya, yb)
				});
			} else if (xb !== 1 || yb !== 1) s.push(pop(s) + "scale(" + xb + "," + yb + ")");
		}
		return function(a, b) {
			var s = [], q = [];
			a = parse(a), b = parse(b);
			translate(a.translateX, a.translateY, b.translateX, b.translateY, s, q);
			rotate(a.rotate, b.rotate, s, q);
			skewX(a.skewX, b.skewX, s, q);
			scale(a.scaleX, a.scaleY, b.scaleX, b.scaleY, s, q);
			a = b = null;
			return function(t) {
				var i = -1, n = q.length, o;
				while (++i < n) s[(o = q[i]).i] = o.x(t);
				return s.join("");
			};
		};
	}
	var interpolateTransformCss = interpolateTransform(parseCss, "px, ", "px)", "deg)");
	var interpolateTransformSvg = interpolateTransform(parseSvg, ", ", ")", ")");

//#endregion
//#region node_modules/.pnpm/d3-timer@3.0.1/node_modules/d3-timer/src/timer.js
	var frame = 0, timeout = 0, interval = 0, pokeDelay = 1e3, taskHead, taskTail, clockLast = 0, clockNow = 0, clockSkew = 0, clock = typeof performance === "object" && performance.now ? performance : Date, setFrame = typeof window === "object" && window.requestAnimationFrame ? window.requestAnimationFrame.bind(window) : function(f) {
		setTimeout(f, 17);
	};
	function now() {
		return clockNow || (setFrame(clearNow), clockNow = clock.now() + clockSkew);
	}
	function clearNow() {
		clockNow = 0;
	}
	function Timer() {
		this._call = this._time = this._next = null;
	}
	Timer.prototype = timer.prototype = {
		constructor: Timer,
		restart: function(callback, delay, time) {
			if (typeof callback !== "function") throw new TypeError("callback is not a function");
			time = (time == null ? now() : +time) + (delay == null ? 0 : +delay);
			if (!this._next && taskTail !== this) {
				if (taskTail) taskTail._next = this;
				else taskHead = this;
				taskTail = this;
			}
			this._call = callback;
			this._time = time;
			sleep();
		},
		stop: function() {
			if (this._call) {
				this._call = null;
				this._time = Infinity;
				sleep();
			}
		}
	};
	function timer(callback, delay, time) {
		var t = new Timer();
		t.restart(callback, delay, time);
		return t;
	}
	function timerFlush() {
		now();
		++frame;
		var t = taskHead, e;
		while (t) {
			if ((e = clockNow - t._time) >= 0) t._call.call(void 0, e);
			t = t._next;
		}
		--frame;
	}
	function wake() {
		clockNow = (clockLast = clock.now()) + clockSkew;
		frame = timeout = 0;
		try {
			timerFlush();
		} finally {
			frame = 0;
			nap();
			clockNow = 0;
		}
	}
	function poke() {
		var now = clock.now(), delay = now - clockLast;
		if (delay > pokeDelay) clockSkew -= delay, clockLast = now;
	}
	function nap() {
		var t0, t1 = taskHead, t2, time = Infinity;
		while (t1) if (t1._call) {
			if (time > t1._time) time = t1._time;
			t0 = t1, t1 = t1._next;
		} else {
			t2 = t1._next, t1._next = null;
			t1 = t0 ? t0._next = t2 : taskHead = t2;
		}
		taskTail = t0;
		sleep(time);
	}
	function sleep(time) {
		if (frame) return;
		if (timeout) timeout = clearTimeout(timeout);
		if (time - clockNow > 24) {
			if (time < Infinity) timeout = setTimeout(wake, time - clock.now() - clockSkew);
			if (interval) interval = clearInterval(interval);
		} else {
			if (!interval) clockLast = clock.now(), interval = setInterval(poke, pokeDelay);
			frame = 1, setFrame(wake);
		}
	}

//#endregion
//#region node_modules/.pnpm/d3-timer@3.0.1/node_modules/d3-timer/src/timeout.js
	function timeout_default(callback, delay, time) {
		var t = new Timer();
		delay = delay == null ? 0 : +delay;
		t.restart((elapsed) => {
			t.stop();
			callback(elapsed + delay);
		}, delay, time);
		return t;
	}

//#endregion
//#region node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/transition/schedule.js
	var emptyOn = dispatch("start", "end", "cancel", "interrupt");
	var emptyTween = [];
	var CREATED = 0;
	var SCHEDULED = 1;
	var STARTING = 2;
	var STARTED = 3;
	var RUNNING = 4;
	var ENDING = 5;
	var ENDED = 6;
	function schedule_default(node, name, id, index, group, timing) {
		var schedules = node.__transition;
		if (!schedules) node.__transition = {};
		else if (id in schedules) return;
		create(node, id, {
			name,
			index,
			group,
			on: emptyOn,
			tween: emptyTween,
			time: timing.time,
			delay: timing.delay,
			duration: timing.duration,
			ease: timing.ease,
			timer: null,
			state: 0
		});
	}
	function init(node, id) {
		var schedule = get(node, id);
		if (schedule.state > 0) throw new Error("too late; already scheduled");
		return schedule;
	}
	function set(node, id) {
		var schedule = get(node, id);
		if (schedule.state > 3) throw new Error("too late; already running");
		return schedule;
	}
	function get(node, id) {
		var schedule = node.__transition;
		if (!schedule || !(schedule = schedule[id])) throw new Error("transition not found");
		return schedule;
	}
	function create(node, id, self) {
		var schedules = node.__transition, tween;
		schedules[id] = self;
		self.timer = timer(schedule, 0, self.time);
		function schedule(elapsed) {
			self.state = 1;
			self.timer.restart(start, self.delay, self.time);
			if (self.delay <= elapsed) start(elapsed - self.delay);
		}
		function start(elapsed) {
			var i, j, n, o;
			if (self.state !== 1) return stop();
			for (i in schedules) {
				o = schedules[i];
				if (o.name !== self.name) continue;
				if (o.state === 3) return timeout_default(start);
				if (o.state === 4) {
					o.state = 6;
					o.timer.stop();
					o.on.call("interrupt", node, node.__data__, o.index, o.group);
					delete schedules[i];
				} else if (+i < id) {
					o.state = 6;
					o.timer.stop();
					o.on.call("cancel", node, node.__data__, o.index, o.group);
					delete schedules[i];
				}
			}
			timeout_default(function() {
				if (self.state === 3) {
					self.state = 4;
					self.timer.restart(tick, self.delay, self.time);
					tick(elapsed);
				}
			});
			self.state = 2;
			self.on.call("start", node, node.__data__, self.index, self.group);
			if (self.state !== 2) return;
			self.state = 3;
			tween = new Array(n = self.tween.length);
			for (i = 0, j = -1; i < n; ++i) if (o = self.tween[i].value.call(node, node.__data__, self.index, self.group)) tween[++j] = o;
			tween.length = j + 1;
		}
		function tick(elapsed) {
			var t = elapsed < self.duration ? self.ease.call(null, elapsed / self.duration) : (self.timer.restart(stop), self.state = 5, 1), i = -1, n = tween.length;
			while (++i < n) tween[i].call(node, t);
			if (self.state === 5) {
				self.on.call("end", node, node.__data__, self.index, self.group);
				stop();
			}
		}
		function stop() {
			self.state = 6;
			self.timer.stop();
			delete schedules[id];
			for (var i in schedules) return;
			delete node.__transition;
		}
	}

//#endregion
//#region node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/interrupt.js
	function interrupt_default$1(node, name) {
		var schedules = node.__transition, schedule, active, empty = true, i;
		if (!schedules) return;
		name = name == null ? null : name + "";
		for (i in schedules) {
			if ((schedule = schedules[i]).name !== name) {
				empty = false;
				continue;
			}
			active = schedule.state > 2 && schedule.state < 5;
			schedule.state = 6;
			schedule.timer.stop();
			schedule.on.call(active ? "interrupt" : "cancel", node, node.__data__, schedule.index, schedule.group);
			delete schedules[i];
		}
		if (empty) delete node.__transition;
	}

//#endregion
//#region node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/selection/interrupt.js
	function interrupt_default(name) {
		return this.each(function() {
			interrupt_default$1(this, name);
		});
	}

//#endregion
//#region node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/transition/tween.js
	function tweenRemove(id, name) {
		var tween0, tween1;
		return function() {
			var schedule = set(this, id), tween = schedule.tween;
			if (tween !== tween0) {
				tween1 = tween0 = tween;
				for (var i = 0, n = tween1.length; i < n; ++i) if (tween1[i].name === name) {
					tween1 = tween1.slice();
					tween1.splice(i, 1);
					break;
				}
			}
			schedule.tween = tween1;
		};
	}
	function tweenFunction(id, name, value) {
		var tween0, tween1;
		if (typeof value !== "function") throw new Error();
		return function() {
			var schedule = set(this, id), tween = schedule.tween;
			if (tween !== tween0) {
				tween1 = (tween0 = tween).slice();
				for (var t = {
					name,
					value
				}, i = 0, n = tween1.length; i < n; ++i) if (tween1[i].name === name) {
					tween1[i] = t;
					break;
				}
				if (i === n) tween1.push(t);
			}
			schedule.tween = tween1;
		};
	}
	function tween_default(name, value) {
		var id = this._id;
		name += "";
		if (arguments.length < 2) {
			var tween = get(this.node(), id).tween;
			for (var i = 0, n = tween.length, t; i < n; ++i) if ((t = tween[i]).name === name) return t.value;
			return null;
		}
		return this.each((value == null ? tweenRemove : tweenFunction)(id, name, value));
	}
	function tweenValue(transition, name, value) {
		var id = transition._id;
		transition.each(function() {
			var schedule = set(this, id);
			(schedule.value || (schedule.value = {}))[name] = value.apply(this, arguments);
		});
		return function(node) {
			return get(node, id).value[name];
		};
	}

//#endregion
//#region node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/transition/interpolate.js
	function interpolate_default(a, b) {
		var c;
		return (typeof b === "number" ? number_default : b instanceof color ? rgb_default : (c = color(b)) ? (b = c, rgb_default) : string_default)(a, b);
	}

//#endregion
//#region node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/transition/attr.js
	function attrRemove(name) {
		return function() {
			this.removeAttribute(name);
		};
	}
	function attrRemoveNS(fullname) {
		return function() {
			this.removeAttributeNS(fullname.space, fullname.local);
		};
	}
	function attrConstant(name, interpolate, value1) {
		var string00, string1 = value1 + "", interpolate0;
		return function() {
			var string0 = this.getAttribute(name);
			return string0 === string1 ? null : string0 === string00 ? interpolate0 : interpolate0 = interpolate(string00 = string0, value1);
		};
	}
	function attrConstantNS(fullname, interpolate, value1) {
		var string00, string1 = value1 + "", interpolate0;
		return function() {
			var string0 = this.getAttributeNS(fullname.space, fullname.local);
			return string0 === string1 ? null : string0 === string00 ? interpolate0 : interpolate0 = interpolate(string00 = string0, value1);
		};
	}
	function attrFunction(name, interpolate, value) {
		var string00, string10, interpolate0;
		return function() {
			var string0, value1 = value(this), string1;
			if (value1 == null) return void this.removeAttribute(name);
			string0 = this.getAttribute(name);
			string1 = value1 + "";
			return string0 === string1 ? null : string0 === string00 && string1 === string10 ? interpolate0 : (string10 = string1, interpolate0 = interpolate(string00 = string0, value1));
		};
	}
	function attrFunctionNS(fullname, interpolate, value) {
		var string00, string10, interpolate0;
		return function() {
			var string0, value1 = value(this), string1;
			if (value1 == null) return void this.removeAttributeNS(fullname.space, fullname.local);
			string0 = this.getAttributeNS(fullname.space, fullname.local);
			string1 = value1 + "";
			return string0 === string1 ? null : string0 === string00 && string1 === string10 ? interpolate0 : (string10 = string1, interpolate0 = interpolate(string00 = string0, value1));
		};
	}
	function attr_default(name, value) {
		var fullname = namespace_default(name), i = fullname === "transform" ? interpolateTransformSvg : interpolate_default;
		return this.attrTween(name, typeof value === "function" ? (fullname.local ? attrFunctionNS : attrFunction)(fullname, i, tweenValue(this, "attr." + name, value)) : value == null ? (fullname.local ? attrRemoveNS : attrRemove)(fullname) : (fullname.local ? attrConstantNS : attrConstant)(fullname, i, value));
	}

//#endregion
//#region node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/transition/attrTween.js
	function attrInterpolate(name, i) {
		return function(t) {
			this.setAttribute(name, i.call(this, t));
		};
	}
	function attrInterpolateNS(fullname, i) {
		return function(t) {
			this.setAttributeNS(fullname.space, fullname.local, i.call(this, t));
		};
	}
	function attrTweenNS(fullname, value) {
		var t0, i0;
		function tween() {
			var i = value.apply(this, arguments);
			if (i !== i0) t0 = (i0 = i) && attrInterpolateNS(fullname, i);
			return t0;
		}
		tween._value = value;
		return tween;
	}
	function attrTween(name, value) {
		var t0, i0;
		function tween() {
			var i = value.apply(this, arguments);
			if (i !== i0) t0 = (i0 = i) && attrInterpolate(name, i);
			return t0;
		}
		tween._value = value;
		return tween;
	}
	function attrTween_default(name, value) {
		var key = "attr." + name;
		if (arguments.length < 2) return (key = this.tween(key)) && key._value;
		if (value == null) return this.tween(key, null);
		if (typeof value !== "function") throw new Error();
		var fullname = namespace_default(name);
		return this.tween(key, (fullname.local ? attrTweenNS : attrTween)(fullname, value));
	}

//#endregion
//#region node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/transition/delay.js
	function delayFunction(id, value) {
		return function() {
			init(this, id).delay = +value.apply(this, arguments);
		};
	}
	function delayConstant(id, value) {
		return value = +value, function() {
			init(this, id).delay = value;
		};
	}
	function delay_default(value) {
		var id = this._id;
		return arguments.length ? this.each((typeof value === "function" ? delayFunction : delayConstant)(id, value)) : get(this.node(), id).delay;
	}

//#endregion
//#region node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/transition/duration.js
	function durationFunction(id, value) {
		return function() {
			set(this, id).duration = +value.apply(this, arguments);
		};
	}
	function durationConstant(id, value) {
		return value = +value, function() {
			set(this, id).duration = value;
		};
	}
	function duration_default(value) {
		var id = this._id;
		return arguments.length ? this.each((typeof value === "function" ? durationFunction : durationConstant)(id, value)) : get(this.node(), id).duration;
	}

//#endregion
//#region node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/transition/ease.js
	function easeConstant(id, value) {
		if (typeof value !== "function") throw new Error();
		return function() {
			set(this, id).ease = value;
		};
	}
	function ease_default(value) {
		var id = this._id;
		return arguments.length ? this.each(easeConstant(id, value)) : get(this.node(), id).ease;
	}

//#endregion
//#region node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/transition/easeVarying.js
	function easeVarying(id, value) {
		return function() {
			var v = value.apply(this, arguments);
			if (typeof v !== "function") throw new Error();
			set(this, id).ease = v;
		};
	}
	function easeVarying_default(value) {
		if (typeof value !== "function") throw new Error();
		return this.each(easeVarying(this._id, value));
	}

//#endregion
//#region node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/transition/filter.js
	function filter_default(match) {
		if (typeof match !== "function") match = matcher_default(match);
		for (var groups = this._groups, m = groups.length, subgroups = new Array(m), j = 0; j < m; ++j) for (var group = groups[j], n = group.length, subgroup = subgroups[j] = [], node, i = 0; i < n; ++i) if ((node = group[i]) && match.call(node, node.__data__, i, group)) subgroup.push(node);
		return new Transition(subgroups, this._parents, this._name, this._id);
	}

//#endregion
//#region node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/transition/merge.js
	function merge_default(transition) {
		if (transition._id !== this._id) throw new Error();
		for (var groups0 = this._groups, groups1 = transition._groups, m0 = groups0.length, m1 = groups1.length, m = Math.min(m0, m1), merges = new Array(m0), j = 0; j < m; ++j) for (var group0 = groups0[j], group1 = groups1[j], n = group0.length, merge = merges[j] = new Array(n), node, i = 0; i < n; ++i) if (node = group0[i] || group1[i]) merge[i] = node;
		for (; j < m0; ++j) merges[j] = groups0[j];
		return new Transition(merges, this._parents, this._name, this._id);
	}

//#endregion
//#region node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/transition/on.js
	function start(name) {
		return (name + "").trim().split(/^|\s+/).every(function(t) {
			var i = t.indexOf(".");
			if (i >= 0) t = t.slice(0, i);
			return !t || t === "start";
		});
	}
	function onFunction(id, name, listener) {
		var on0, on1, sit = start(name) ? init : set;
		return function() {
			var schedule = sit(this, id), on = schedule.on;
			if (on !== on0) (on1 = (on0 = on).copy()).on(name, listener);
			schedule.on = on1;
		};
	}
	function on_default(name, listener) {
		var id = this._id;
		return arguments.length < 2 ? get(this.node(), id).on.on(name) : this.each(onFunction(id, name, listener));
	}

//#endregion
//#region node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/transition/remove.js
	function removeFunction(id) {
		return function() {
			var parent = this.parentNode;
			for (var i in this.__transition) if (+i !== id) return;
			if (parent) parent.removeChild(this);
		};
	}
	function remove_default$1() {
		return this.on("end.remove", removeFunction(this._id));
	}

//#endregion
//#region node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/transition/select.js
	function select_default(select) {
		var name = this._name, id = this._id;
		if (typeof select !== "function") select = selector_default(select);
		for (var groups = this._groups, m = groups.length, subgroups = new Array(m), j = 0; j < m; ++j) for (var group = groups[j], n = group.length, subgroup = subgroups[j] = new Array(n), node, subnode, i = 0; i < n; ++i) if ((node = group[i]) && (subnode = select.call(node, node.__data__, i, group))) {
			if ("__data__" in node) subnode.__data__ = node.__data__;
			subgroup[i] = subnode;
			schedule_default(subgroup[i], name, id, i, subgroup, get(node, id));
		}
		return new Transition(subgroups, this._parents, name, id);
	}

//#endregion
//#region node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/transition/selectAll.js
	function selectAll_default(select) {
		var name = this._name, id = this._id;
		if (typeof select !== "function") select = selectorAll_default(select);
		for (var groups = this._groups, m = groups.length, subgroups = [], parents = [], j = 0; j < m; ++j) for (var group = groups[j], n = group.length, node, i = 0; i < n; ++i) if (node = group[i]) {
			for (var children = select.call(node, node.__data__, i, group), child, inherit = get(node, id), k = 0, l = children.length; k < l; ++k) if (child = children[k]) schedule_default(child, name, id, k, children, inherit);
			subgroups.push(children);
			parents.push(node);
		}
		return new Transition(subgroups, parents, name, id);
	}

//#endregion
//#region node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/transition/selection.js
	var Selection = selection.prototype.constructor;
	function selection_default() {
		return new Selection(this._groups, this._parents);
	}

//#endregion
//#region node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/transition/style.js
	function styleNull(name, interpolate) {
		var string00, string10, interpolate0;
		return function() {
			var string0 = styleValue(this, name), string1 = (this.style.removeProperty(name), styleValue(this, name));
			return string0 === string1 ? null : string0 === string00 && string1 === string10 ? interpolate0 : interpolate0 = interpolate(string00 = string0, string10 = string1);
		};
	}
	function styleRemove(name) {
		return function() {
			this.style.removeProperty(name);
		};
	}
	function styleConstant(name, interpolate, value1) {
		var string00, string1 = value1 + "", interpolate0;
		return function() {
			var string0 = styleValue(this, name);
			return string0 === string1 ? null : string0 === string00 ? interpolate0 : interpolate0 = interpolate(string00 = string0, value1);
		};
	}
	function styleFunction(name, interpolate, value) {
		var string00, string10, interpolate0;
		return function() {
			var string0 = styleValue(this, name), value1 = value(this), string1 = value1 + "";
			if (value1 == null) string1 = value1 = (this.style.removeProperty(name), styleValue(this, name));
			return string0 === string1 ? null : string0 === string00 && string1 === string10 ? interpolate0 : (string10 = string1, interpolate0 = interpolate(string00 = string0, value1));
		};
	}
	function styleMaybeRemove(id, name) {
		var on0, on1, listener0, key = "style." + name, event = "end." + key, remove;
		return function() {
			var schedule = set(this, id), on = schedule.on, listener = schedule.value[key] == null ? remove || (remove = styleRemove(name)) : void 0;
			if (on !== on0 || listener0 !== listener) (on1 = (on0 = on).copy()).on(event, listener0 = listener);
			schedule.on = on1;
		};
	}
	function style_default(name, value, priority) {
		var i = (name += "") === "transform" ? interpolateTransformCss : interpolate_default;
		return value == null ? this.styleTween(name, styleNull(name, i)).on("end.style." + name, styleRemove(name)) : typeof value === "function" ? this.styleTween(name, styleFunction(name, i, tweenValue(this, "style." + name, value))).each(styleMaybeRemove(this._id, name)) : this.styleTween(name, styleConstant(name, i, value), priority).on("end.style." + name, null);
	}

//#endregion
//#region node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/transition/styleTween.js
	function styleInterpolate(name, i, priority) {
		return function(t) {
			this.style.setProperty(name, i.call(this, t), priority);
		};
	}
	function styleTween(name, value, priority) {
		var t, i0;
		function tween() {
			var i = value.apply(this, arguments);
			if (i !== i0) t = (i0 = i) && styleInterpolate(name, i, priority);
			return t;
		}
		tween._value = value;
		return tween;
	}
	function styleTween_default(name, value, priority) {
		var key = "style." + (name += "");
		if (arguments.length < 2) return (key = this.tween(key)) && key._value;
		if (value == null) return this.tween(key, null);
		if (typeof value !== "function") throw new Error();
		return this.tween(key, styleTween(name, value, priority == null ? "" : priority));
	}

//#endregion
//#region node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/transition/text.js
	function textConstant(value) {
		return function() {
			this.textContent = value;
		};
	}
	function textFunction(value) {
		return function() {
			var value1 = value(this);
			this.textContent = value1 == null ? "" : value1;
		};
	}
	function text_default(value) {
		return this.tween("text", typeof value === "function" ? textFunction(tweenValue(this, "text", value)) : textConstant(value == null ? "" : value + ""));
	}

//#endregion
//#region node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/transition/textTween.js
	function textInterpolate(i) {
		return function(t) {
			this.textContent = i.call(this, t);
		};
	}
	function textTween(value) {
		var t0, i0;
		function tween() {
			var i = value.apply(this, arguments);
			if (i !== i0) t0 = (i0 = i) && textInterpolate(i);
			return t0;
		}
		tween._value = value;
		return tween;
	}
	function textTween_default(value) {
		var key = "text";
		if (arguments.length < 1) return (key = this.tween(key)) && key._value;
		if (value == null) return this.tween(key, null);
		if (typeof value !== "function") throw new Error();
		return this.tween(key, textTween(value));
	}

//#endregion
//#region node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/transition/transition.js
	function transition_default$1() {
		var name = this._name, id0 = this._id, id1 = newId();
		for (var groups = this._groups, m = groups.length, j = 0; j < m; ++j) for (var group = groups[j], n = group.length, node, i = 0; i < n; ++i) if (node = group[i]) {
			var inherit = get(node, id0);
			schedule_default(node, name, id1, i, group, {
				time: inherit.time + inherit.delay + inherit.duration,
				delay: 0,
				duration: inherit.duration,
				ease: inherit.ease
			});
		}
		return new Transition(groups, this._parents, name, id1);
	}

//#endregion
//#region node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/transition/end.js
	function end_default() {
		var on0, on1, that = this, id = that._id, size = that.size();
		return new Promise(function(resolve, reject) {
			var cancel = { value: reject }, end = { value: function() {
				if (--size === 0) resolve();
			} };
			that.each(function() {
				var schedule = set(this, id), on = schedule.on;
				if (on !== on0) {
					on1 = (on0 = on).copy();
					on1._.cancel.push(cancel);
					on1._.interrupt.push(cancel);
					on1._.end.push(end);
				}
				schedule.on = on1;
			});
			if (size === 0) resolve();
		});
	}

//#endregion
//#region node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/transition/index.js
	var id = 0;
	function Transition(groups, parents, name, id) {
		this._groups = groups;
		this._parents = parents;
		this._name = name;
		this._id = id;
	}
	function transition(name) {
		return selection().transition(name);
	}
	function newId() {
		return ++id;
	}
	var selection_prototype = selection.prototype;
	Transition.prototype = transition.prototype = {
		constructor: Transition,
		select: select_default,
		selectAll: selectAll_default,
		selectChild: selection_prototype.selectChild,
		selectChildren: selection_prototype.selectChildren,
		filter: filter_default,
		merge: merge_default,
		selection: selection_default,
		transition: transition_default$1,
		call: selection_prototype.call,
		nodes: selection_prototype.nodes,
		node: selection_prototype.node,
		size: selection_prototype.size,
		empty: selection_prototype.empty,
		each: selection_prototype.each,
		on: on_default,
		attr: attr_default,
		attrTween: attrTween_default,
		style: style_default,
		styleTween: styleTween_default,
		text: text_default,
		textTween: textTween_default,
		remove: remove_default$1,
		tween: tween_default,
		delay: delay_default,
		duration: duration_default,
		ease: ease_default,
		easeVarying: easeVarying_default,
		end: end_default,
		[Symbol.iterator]: selection_prototype[Symbol.iterator]
	};

//#endregion
//#region node_modules/.pnpm/d3-ease@3.0.1/node_modules/d3-ease/src/cubic.js
	function cubicIn(t) {
		return t * t * t;
	}
	function cubicOut(t) {
		return --t * t * t + 1;
	}
	function cubicInOut(t) {
		return ((t *= 2) <= 1 ? t * t * t : (t -= 2) * t * t + 2) / 2;
	}

//#endregion
//#region node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/selection/transition.js
	var defaultTiming = {
		time: null,
		delay: 0,
		duration: 250,
		ease: cubicInOut
	};
	function inherit(node, id) {
		var timing;
		while (!(timing = node.__transition) || !(timing = timing[id])) if (!(node = node.parentNode)) throw new Error(`transition ${id} not found`);
		return timing;
	}
	function transition_default(name) {
		var id, timing;
		if (name instanceof Transition) id = name._id, name = name._name;
		else id = newId(), (timing = defaultTiming).time = now(), name = name == null ? null : name + "";
		for (var groups = this._groups, m = groups.length, j = 0; j < m; ++j) for (var group = groups[j], n = group.length, node, i = 0; i < n; ++i) if (node = group[i]) schedule_default(node, name, id, i, group, timing || inherit(node, id));
		return new Transition(groups, this._parents, name, id);
	}

//#endregion
//#region node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/selection/index.js
	selection.prototype.interrupt = interrupt_default;
	selection.prototype.transition = transition_default;

//#endregion
//#region node_modules/.pnpm/d3-brush@3.0.0/node_modules/d3-brush/src/brush.js
	const { abs: abs$1, max: max$1, min: min$1 } = Math;
	function number1(e) {
		return [+e[0], +e[1]];
	}
	function number2(e) {
		return [number1(e[0]), number1(e[1])];
	}
	var X = {
		name: "x",
		handles: ["w", "e"].map(type),
		input: function(x, e) {
			return x == null ? null : [[+x[0], e[0][1]], [+x[1], e[1][1]]];
		},
		output: function(xy) {
			return xy && [xy[0][0], xy[1][0]];
		}
	};
	var Y = {
		name: "y",
		handles: ["n", "s"].map(type),
		input: function(y, e) {
			return y == null ? null : [[e[0][0], +y[0]], [e[1][0], +y[1]]];
		},
		output: function(xy) {
			return xy && [xy[0][1], xy[1][1]];
		}
	};
	var XY = {
		name: "xy",
		handles: [
			"n",
			"w",
			"e",
			"s",
			"nw",
			"ne",
			"sw",
			"se"
		].map(type),
		input: function(xy) {
			return xy == null ? null : number2(xy);
		},
		output: function(xy) {
			return xy;
		}
	};
	function type(t) {
		return { type: t };
	}

//#endregion
//#region node_modules/.pnpm/d3-path@3.1.0/node_modules/d3-path/src/path.js
	const pi$1 = Math.PI, tau$1 = 2 * pi$1, epsilon$1 = 1e-6, tauEpsilon = tau$1 - epsilon$1;
	function append(strings) {
		this._ += strings[0];
		for (let i = 1, n = strings.length; i < n; ++i) this._ += arguments[i] + strings[i];
	}
	function appendRound(digits) {
		let d = Math.floor(digits);
		if (!(d >= 0)) throw new Error(`invalid digits: ${digits}`);
		if (d > 15) return append;
		const k = 10 ** d;
		return function(strings) {
			this._ += strings[0];
			for (let i = 1, n = strings.length; i < n; ++i) this._ += Math.round(arguments[i] * k) / k + strings[i];
		};
	}
	var Path = class {
		constructor(digits) {
			this._x0 = this._y0 = this._x1 = this._y1 = null;
			this._ = "";
			this._append = digits == null ? append : appendRound(digits);
		}
		moveTo(x, y) {
			this._append`M${this._x0 = this._x1 = +x},${this._y0 = this._y1 = +y}`;
		}
		closePath() {
			if (this._x1 !== null) {
				this._x1 = this._x0, this._y1 = this._y0;
				this._append`Z`;
			}
		}
		lineTo(x, y) {
			this._append`L${this._x1 = +x},${this._y1 = +y}`;
		}
		quadraticCurveTo(x1, y1, x, y) {
			this._append`Q${+x1},${+y1},${this._x1 = +x},${this._y1 = +y}`;
		}
		bezierCurveTo(x1, y1, x2, y2, x, y) {
			this._append`C${+x1},${+y1},${+x2},${+y2},${this._x1 = +x},${this._y1 = +y}`;
		}
		arcTo(x1, y1, x2, y2, r) {
			x1 = +x1, y1 = +y1, x2 = +x2, y2 = +y2, r = +r;
			if (r < 0) throw new Error(`negative radius: ${r}`);
			let x0 = this._x1, y0 = this._y1, x21 = x2 - x1, y21 = y2 - y1, x01 = x0 - x1, y01 = y0 - y1, l01_2 = x01 * x01 + y01 * y01;
			if (this._x1 === null) this._append`M${this._x1 = x1},${this._y1 = y1}`;
			else if (!(l01_2 > epsilon$1));
			else if (!(Math.abs(y01 * x21 - y21 * x01) > epsilon$1) || !r) this._append`L${this._x1 = x1},${this._y1 = y1}`;
			else {
				let x20 = x2 - x0, y20 = y2 - y0, l21_2 = x21 * x21 + y21 * y21, l20_2 = x20 * x20 + y20 * y20, l21 = Math.sqrt(l21_2), l01 = Math.sqrt(l01_2), l = r * Math.tan((pi$1 - Math.acos((l21_2 + l01_2 - l20_2) / (2 * l21 * l01))) / 2), t01 = l / l01, t21 = l / l21;
				if (Math.abs(t01 - 1) > epsilon$1) this._append`L${x1 + t01 * x01},${y1 + t01 * y01}`;
				this._append`A${r},${r},0,0,${+(y01 * x20 > x01 * y20)},${this._x1 = x1 + t21 * x21},${this._y1 = y1 + t21 * y21}`;
			}
		}
		arc(x, y, r, a0, a1, ccw) {
			x = +x, y = +y, r = +r, ccw = !!ccw;
			if (r < 0) throw new Error(`negative radius: ${r}`);
			let dx = r * Math.cos(a0), dy = r * Math.sin(a0), x0 = x + dx, y0 = y + dy, cw = 1 ^ ccw, da = ccw ? a0 - a1 : a1 - a0;
			if (this._x1 === null) this._append`M${x0},${y0}`;
			else if (Math.abs(this._x1 - x0) > epsilon$1 || Math.abs(this._y1 - y0) > epsilon$1) this._append`L${x0},${y0}`;
			if (!r) return;
			if (da < 0) da = da % tau$1 + tau$1;
			if (da > tauEpsilon) this._append`A${r},${r},0,1,${cw},${x - dx},${y - dy}A${r},${r},0,1,${cw},${this._x1 = x0},${this._y1 = y0}`;
			else if (da > epsilon$1) this._append`A${r},${r},0,${+(da >= pi$1)},${cw},${this._x1 = x + r * Math.cos(a1)},${this._y1 = y + r * Math.sin(a1)}`;
		}
		rect(x, y, w, h) {
			this._append`M${this._x0 = this._x1 = +x},${this._y0 = this._y1 = +y}h${w = +w}v${+h}h${-w}Z`;
		}
		toString() {
			return this._;
		}
	};
	function path() {
		return new Path();
	}
	path.prototype = Path.prototype;

//#endregion
//#region node_modules/.pnpm/d3-force@3.0.0/node_modules/d3-force/src/center.js
	function center_default(x, y) {
		var nodes, strength = 1;
		if (x == null) x = 0;
		if (y == null) y = 0;
		function force() {
			var i, n = nodes.length, node, sx = 0, sy = 0;
			for (i = 0; i < n; ++i) node = nodes[i], sx += node.x, sy += node.y;
			for (sx = (sx / n - x) * strength, sy = (sy / n - y) * strength, i = 0; i < n; ++i) node = nodes[i], node.x -= sx, node.y -= sy;
		}
		force.initialize = function(_) {
			nodes = _;
		};
		force.x = function(_) {
			return arguments.length ? (x = +_, force) : x;
		};
		force.y = function(_) {
			return arguments.length ? (y = +_, force) : y;
		};
		force.strength = function(_) {
			return arguments.length ? (strength = +_, force) : strength;
		};
		return force;
	}

//#endregion
//#region node_modules/.pnpm/d3-quadtree@3.0.1/node_modules/d3-quadtree/src/add.js
	function add_default(d) {
		const x = +this._x.call(null, d), y = +this._y.call(null, d);
		return add(this.cover(x, y), x, y, d);
	}
	function add(tree, x, y, d) {
		if (isNaN(x) || isNaN(y)) return tree;
		var parent, node = tree._root, leaf = { data: d }, x0 = tree._x0, y0 = tree._y0, x1 = tree._x1, y1 = tree._y1, xm, ym, xp, yp, right, bottom, i, j;
		if (!node) return tree._root = leaf, tree;
		while (node.length) {
			if (right = x >= (xm = (x0 + x1) / 2)) x0 = xm;
			else x1 = xm;
			if (bottom = y >= (ym = (y0 + y1) / 2)) y0 = ym;
			else y1 = ym;
			if (parent = node, !(node = node[i = bottom << 1 | right])) return parent[i] = leaf, tree;
		}
		xp = +tree._x.call(null, node.data);
		yp = +tree._y.call(null, node.data);
		if (x === xp && y === yp) return leaf.next = node, parent ? parent[i] = leaf : tree._root = leaf, tree;
		do {
			parent = parent ? parent[i] = new Array(4) : tree._root = new Array(4);
			if (right = x >= (xm = (x0 + x1) / 2)) x0 = xm;
			else x1 = xm;
			if (bottom = y >= (ym = (y0 + y1) / 2)) y0 = ym;
			else y1 = ym;
		} while ((i = bottom << 1 | right) === (j = (yp >= ym) << 1 | xp >= xm));
		return parent[j] = node, parent[i] = leaf, tree;
	}
	function addAll(data) {
		var d, i, n = data.length, x, y, xz = new Array(n), yz = new Array(n), x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
		for (i = 0; i < n; ++i) {
			if (isNaN(x = +this._x.call(null, d = data[i])) || isNaN(y = +this._y.call(null, d))) continue;
			xz[i] = x;
			yz[i] = y;
			if (x < x0) x0 = x;
			if (x > x1) x1 = x;
			if (y < y0) y0 = y;
			if (y > y1) y1 = y;
		}
		if (x0 > x1 || y0 > y1) return this;
		this.cover(x0, y0).cover(x1, y1);
		for (i = 0; i < n; ++i) add(this, xz[i], yz[i], data[i]);
		return this;
	}

//#endregion
//#region node_modules/.pnpm/d3-quadtree@3.0.1/node_modules/d3-quadtree/src/cover.js
	function cover_default(x, y) {
		if (isNaN(x = +x) || isNaN(y = +y)) return this;
		var x0 = this._x0, y0 = this._y0, x1 = this._x1, y1 = this._y1;
		if (isNaN(x0)) {
			x1 = (x0 = Math.floor(x)) + 1;
			y1 = (y0 = Math.floor(y)) + 1;
		} else {
			var z = x1 - x0 || 1, node = this._root, parent, i;
			while (x0 > x || x >= x1 || y0 > y || y >= y1) {
				i = (y < y0) << 1 | x < x0;
				parent = new Array(4), parent[i] = node, node = parent, z *= 2;
				switch (i) {
					case 0:
						x1 = x0 + z, y1 = y0 + z;
						break;
					case 1:
						x0 = x1 - z, y1 = y0 + z;
						break;
					case 2:
						x1 = x0 + z, y0 = y1 - z;
						break;
					case 3:
						x0 = x1 - z, y0 = y1 - z;
						break;
				}
			}
			if (this._root && this._root.length) this._root = node;
		}
		this._x0 = x0;
		this._y0 = y0;
		this._x1 = x1;
		this._y1 = y1;
		return this;
	}

//#endregion
//#region node_modules/.pnpm/d3-quadtree@3.0.1/node_modules/d3-quadtree/src/data.js
	function data_default() {
		var data = [];
		this.visit(function(node) {
			if (!node.length) do
				data.push(node.data);
			while (node = node.next);
		});
		return data;
	}

//#endregion
//#region node_modules/.pnpm/d3-quadtree@3.0.1/node_modules/d3-quadtree/src/extent.js
	function extent_default(_) {
		return arguments.length ? this.cover(+_[0][0], +_[0][1]).cover(+_[1][0], +_[1][1]) : isNaN(this._x0) ? void 0 : [[this._x0, this._y0], [this._x1, this._y1]];
	}

//#endregion
//#region node_modules/.pnpm/d3-quadtree@3.0.1/node_modules/d3-quadtree/src/quad.js
	function quad_default(node, x0, y0, x1, y1) {
		this.node = node;
		this.x0 = x0;
		this.y0 = y0;
		this.x1 = x1;
		this.y1 = y1;
	}

//#endregion
//#region node_modules/.pnpm/d3-quadtree@3.0.1/node_modules/d3-quadtree/src/find.js
	function find_default(x, y, radius) {
		var data, x0 = this._x0, y0 = this._y0, x1, y1, x2, y2, x3 = this._x1, y3 = this._y1, quads = [], node = this._root, q, i;
		if (node) quads.push(new quad_default(node, x0, y0, x3, y3));
		if (radius == null) radius = Infinity;
		else {
			x0 = x - radius, y0 = y - radius;
			x3 = x + radius, y3 = y + radius;
			radius *= radius;
		}
		while (q = quads.pop()) {
			if (!(node = q.node) || (x1 = q.x0) > x3 || (y1 = q.y0) > y3 || (x2 = q.x1) < x0 || (y2 = q.y1) < y0) continue;
			if (node.length) {
				var xm = (x1 + x2) / 2, ym = (y1 + y2) / 2;
				quads.push(new quad_default(node[3], xm, ym, x2, y2), new quad_default(node[2], x1, ym, xm, y2), new quad_default(node[1], xm, y1, x2, ym), new quad_default(node[0], x1, y1, xm, ym));
				if (i = (y >= ym) << 1 | x >= xm) {
					q = quads[quads.length - 1];
					quads[quads.length - 1] = quads[quads.length - 1 - i];
					quads[quads.length - 1 - i] = q;
				}
			} else {
				var dx = x - +this._x.call(null, node.data), dy = y - +this._y.call(null, node.data), d2 = dx * dx + dy * dy;
				if (d2 < radius) {
					var d = Math.sqrt(radius = d2);
					x0 = x - d, y0 = y - d;
					x3 = x + d, y3 = y + d;
					data = node.data;
				}
			}
		}
		return data;
	}

//#endregion
//#region node_modules/.pnpm/d3-quadtree@3.0.1/node_modules/d3-quadtree/src/remove.js
	function remove_default(d) {
		if (isNaN(x = +this._x.call(null, d)) || isNaN(y = +this._y.call(null, d))) return this;
		var parent, node = this._root, retainer, previous, next, x0 = this._x0, y0 = this._y0, x1 = this._x1, y1 = this._y1, x, y, xm, ym, right, bottom, i, j;
		if (!node) return this;
		if (node.length) while (true) {
			if (right = x >= (xm = (x0 + x1) / 2)) x0 = xm;
			else x1 = xm;
			if (bottom = y >= (ym = (y0 + y1) / 2)) y0 = ym;
			else y1 = ym;
			if (!(parent = node, node = node[i = bottom << 1 | right])) return this;
			if (!node.length) break;
			if (parent[i + 1 & 3] || parent[i + 2 & 3] || parent[i + 3 & 3]) retainer = parent, j = i;
		}
		while (node.data !== d) if (!(previous = node, node = node.next)) return this;
		if (next = node.next) delete node.next;
		if (previous) return next ? previous.next = next : delete previous.next, this;
		if (!parent) return this._root = next, this;
		next ? parent[i] = next : delete parent[i];
		if ((node = parent[0] || parent[1] || parent[2] || parent[3]) && node === (parent[3] || parent[2] || parent[1] || parent[0]) && !node.length) if (retainer) retainer[j] = node;
		else this._root = node;
		return this;
	}
	function removeAll(data) {
		for (var i = 0, n = data.length; i < n; ++i) this.remove(data[i]);
		return this;
	}

//#endregion
//#region node_modules/.pnpm/d3-quadtree@3.0.1/node_modules/d3-quadtree/src/root.js
	function root_default() {
		return this._root;
	}

//#endregion
//#region node_modules/.pnpm/d3-quadtree@3.0.1/node_modules/d3-quadtree/src/size.js
	function size_default() {
		var size = 0;
		this.visit(function(node) {
			if (!node.length) do
				++size;
			while (node = node.next);
		});
		return size;
	}

//#endregion
//#region node_modules/.pnpm/d3-quadtree@3.0.1/node_modules/d3-quadtree/src/visit.js
	function visit_default(callback) {
		var quads = [], q, node = this._root, child, x0, y0, x1, y1;
		if (node) quads.push(new quad_default(node, this._x0, this._y0, this._x1, this._y1));
		while (q = quads.pop()) if (!callback(node = q.node, x0 = q.x0, y0 = q.y0, x1 = q.x1, y1 = q.y1) && node.length) {
			var xm = (x0 + x1) / 2, ym = (y0 + y1) / 2;
			if (child = node[3]) quads.push(new quad_default(child, xm, ym, x1, y1));
			if (child = node[2]) quads.push(new quad_default(child, x0, ym, xm, y1));
			if (child = node[1]) quads.push(new quad_default(child, xm, y0, x1, ym));
			if (child = node[0]) quads.push(new quad_default(child, x0, y0, xm, ym));
		}
		return this;
	}

//#endregion
//#region node_modules/.pnpm/d3-quadtree@3.0.1/node_modules/d3-quadtree/src/visitAfter.js
	function visitAfter_default(callback) {
		var quads = [], next = [], q;
		if (this._root) quads.push(new quad_default(this._root, this._x0, this._y0, this._x1, this._y1));
		while (q = quads.pop()) {
			var node = q.node;
			if (node.length) {
				var child, x0 = q.x0, y0 = q.y0, x1 = q.x1, y1 = q.y1, xm = (x0 + x1) / 2, ym = (y0 + y1) / 2;
				if (child = node[0]) quads.push(new quad_default(child, x0, y0, xm, ym));
				if (child = node[1]) quads.push(new quad_default(child, xm, y0, x1, ym));
				if (child = node[2]) quads.push(new quad_default(child, x0, ym, xm, y1));
				if (child = node[3]) quads.push(new quad_default(child, xm, ym, x1, y1));
			}
			next.push(q);
		}
		while (q = next.pop()) callback(q.node, q.x0, q.y0, q.x1, q.y1);
		return this;
	}

//#endregion
//#region node_modules/.pnpm/d3-quadtree@3.0.1/node_modules/d3-quadtree/src/x.js
	function defaultX(d) {
		return d[0];
	}
	function x_default(_) {
		return arguments.length ? (this._x = _, this) : this._x;
	}

//#endregion
//#region node_modules/.pnpm/d3-quadtree@3.0.1/node_modules/d3-quadtree/src/y.js
	function defaultY(d) {
		return d[1];
	}
	function y_default(_) {
		return arguments.length ? (this._y = _, this) : this._y;
	}

//#endregion
//#region node_modules/.pnpm/d3-quadtree@3.0.1/node_modules/d3-quadtree/src/quadtree.js
	function quadtree(nodes, x, y) {
		var tree = new Quadtree(x == null ? defaultX : x, y == null ? defaultY : y, NaN, NaN, NaN, NaN);
		return nodes == null ? tree : tree.addAll(nodes);
	}
	function Quadtree(x, y, x0, y0, x1, y1) {
		this._x = x;
		this._y = y;
		this._x0 = x0;
		this._y0 = y0;
		this._x1 = x1;
		this._y1 = y1;
		this._root = void 0;
	}
	function leaf_copy(leaf) {
		var copy = { data: leaf.data }, next = copy;
		while (leaf = leaf.next) next = next.next = { data: leaf.data };
		return copy;
	}
	var treeProto = quadtree.prototype = Quadtree.prototype;
	treeProto.copy = function() {
		var copy = new Quadtree(this._x, this._y, this._x0, this._y0, this._x1, this._y1), node = this._root, nodes, child;
		if (!node) return copy;
		if (!node.length) return copy._root = leaf_copy(node), copy;
		nodes = [{
			source: node,
			target: copy._root = new Array(4)
		}];
		while (node = nodes.pop()) for (var i = 0; i < 4; ++i) if (child = node.source[i]) if (child.length) nodes.push({
			source: child,
			target: node.target[i] = new Array(4)
		});
		else node.target[i] = leaf_copy(child);
		return copy;
	};
	treeProto.add = add_default;
	treeProto.addAll = addAll;
	treeProto.cover = cover_default;
	treeProto.data = data_default;
	treeProto.extent = extent_default;
	treeProto.find = find_default;
	treeProto.remove = remove_default;
	treeProto.removeAll = removeAll;
	treeProto.root = root_default;
	treeProto.size = size_default;
	treeProto.visit = visit_default;
	treeProto.visitAfter = visitAfter_default;
	treeProto.x = x_default;
	treeProto.y = y_default;

//#endregion
//#region node_modules/.pnpm/d3-force@3.0.0/node_modules/d3-force/src/constant.js
	function constant_default$1(x) {
		return function() {
			return x;
		};
	}

//#endregion
//#region node_modules/.pnpm/d3-force@3.0.0/node_modules/d3-force/src/jiggle.js
	function jiggle_default(random) {
		return (random() - .5) * 1e-6;
	}

//#endregion
//#region node_modules/.pnpm/d3-force@3.0.0/node_modules/d3-force/src/collide.js
	function x$1(d) {
		return d.x + d.vx;
	}
	function y$1(d) {
		return d.y + d.vy;
	}
	function collide_default(radius) {
		var nodes, radii, random, strength = 1, iterations = 1;
		if (typeof radius !== "function") radius = constant_default$1(radius == null ? 1 : +radius);
		function force() {
			var i, n = nodes.length, tree, node, xi, yi, ri, ri2;
			for (var k = 0; k < iterations; ++k) {
				tree = quadtree(nodes, x$1, y$1).visitAfter(prepare);
				for (i = 0; i < n; ++i) {
					node = nodes[i];
					ri = radii[node.index], ri2 = ri * ri;
					xi = node.x + node.vx;
					yi = node.y + node.vy;
					tree.visit(apply);
				}
			}
			function apply(quad, x0, y0, x1, y1) {
				var data = quad.data, rj = quad.r, r = ri + rj;
				if (data) {
					if (data.index > node.index) {
						var x = xi - data.x - data.vx, y = yi - data.y - data.vy, l = x * x + y * y;
						if (l < r * r) {
							if (x === 0) x = jiggle_default(random), l += x * x;
							if (y === 0) y = jiggle_default(random), l += y * y;
							l = (r - (l = Math.sqrt(l))) / l * strength;
							node.vx += (x *= l) * (r = (rj *= rj) / (ri2 + rj));
							node.vy += (y *= l) * r;
							data.vx -= x * (r = 1 - r);
							data.vy -= y * r;
						}
					}
					return;
				}
				return x0 > xi + r || x1 < xi - r || y0 > yi + r || y1 < yi - r;
			}
		}
		function prepare(quad) {
			if (quad.data) return quad.r = radii[quad.data.index];
			for (var i = quad.r = 0; i < 4; ++i) if (quad[i] && quad[i].r > quad.r) quad.r = quad[i].r;
		}
		function initialize() {
			if (!nodes) return;
			var i, n = nodes.length, node;
			radii = new Array(n);
			for (i = 0; i < n; ++i) node = nodes[i], radii[node.index] = +radius(node, i, nodes);
		}
		force.initialize = function(_nodes, _random) {
			nodes = _nodes;
			random = _random;
			initialize();
		};
		force.iterations = function(_) {
			return arguments.length ? (iterations = +_, force) : iterations;
		};
		force.strength = function(_) {
			return arguments.length ? (strength = +_, force) : strength;
		};
		force.radius = function(_) {
			return arguments.length ? (radius = typeof _ === "function" ? _ : constant_default$1(+_), initialize(), force) : radius;
		};
		return force;
	}

//#endregion
//#region node_modules/.pnpm/d3-force@3.0.0/node_modules/d3-force/src/link.js
	function index(d) {
		return d.index;
	}
	function find(nodeById, nodeId) {
		var node = nodeById.get(nodeId);
		if (!node) throw new Error("node not found: " + nodeId);
		return node;
	}
	function link_default(links) {
		var id = index, strength = defaultStrength, strengths, distance = constant_default$1(30), distances, nodes, count, bias, random, iterations = 1;
		if (links == null) links = [];
		function defaultStrength(link) {
			return 1 / Math.min(count[link.source.index], count[link.target.index]);
		}
		function force(alpha) {
			for (var k = 0, n = links.length; k < iterations; ++k) for (var i = 0, link, source, target, x, y, l, b; i < n; ++i) {
				link = links[i], source = link.source, target = link.target;
				x = target.x + target.vx - source.x - source.vx || jiggle_default(random);
				y = target.y + target.vy - source.y - source.vy || jiggle_default(random);
				l = Math.sqrt(x * x + y * y);
				l = (l - distances[i]) / l * alpha * strengths[i];
				x *= l, y *= l;
				target.vx -= x * (b = bias[i]);
				target.vy -= y * b;
				source.vx += x * (b = 1 - b);
				source.vy += y * b;
			}
		}
		function initialize() {
			if (!nodes) return;
			var i, n = nodes.length, m = links.length, nodeById = new Map(nodes.map((d, i) => [id(d, i, nodes), d])), link;
			for (i = 0, count = new Array(n); i < m; ++i) {
				link = links[i], link.index = i;
				if (typeof link.source !== "object") link.source = find(nodeById, link.source);
				if (typeof link.target !== "object") link.target = find(nodeById, link.target);
				count[link.source.index] = (count[link.source.index] || 0) + 1;
				count[link.target.index] = (count[link.target.index] || 0) + 1;
			}
			for (i = 0, bias = new Array(m); i < m; ++i) link = links[i], bias[i] = count[link.source.index] / (count[link.source.index] + count[link.target.index]);
			strengths = new Array(m), initializeStrength();
			distances = new Array(m), initializeDistance();
		}
		function initializeStrength() {
			if (!nodes) return;
			for (var i = 0, n = links.length; i < n; ++i) strengths[i] = +strength(links[i], i, links);
		}
		function initializeDistance() {
			if (!nodes) return;
			for (var i = 0, n = links.length; i < n; ++i) distances[i] = +distance(links[i], i, links);
		}
		force.initialize = function(_nodes, _random) {
			nodes = _nodes;
			random = _random;
			initialize();
		};
		force.links = function(_) {
			return arguments.length ? (links = _, initialize(), force) : links;
		};
		force.id = function(_) {
			return arguments.length ? (id = _, force) : id;
		};
		force.iterations = function(_) {
			return arguments.length ? (iterations = +_, force) : iterations;
		};
		force.strength = function(_) {
			return arguments.length ? (strength = typeof _ === "function" ? _ : constant_default$1(+_), initializeStrength(), force) : strength;
		};
		force.distance = function(_) {
			return arguments.length ? (distance = typeof _ === "function" ? _ : constant_default$1(+_), initializeDistance(), force) : distance;
		};
		return force;
	}

//#endregion
//#region node_modules/.pnpm/d3-force@3.0.0/node_modules/d3-force/src/lcg.js
	const a$1 = 1664525;
	const c$1 = 1013904223;
	const m = 4294967296;
	function lcg_default() {
		let s = 1;
		return () => (s = (a$1 * s + c$1) % m) / m;
	}

//#endregion
//#region node_modules/.pnpm/d3-force@3.0.0/node_modules/d3-force/src/simulation.js
	function x(d) {
		return d.x;
	}
	function y(d) {
		return d.y;
	}
	var initialRadius = 10, initialAngle = Math.PI * (3 - Math.sqrt(5));
	function simulation_default(nodes) {
		var simulation, alpha = 1, alphaMin = .001, alphaDecay = 1 - Math.pow(alphaMin, 1 / 300), alphaTarget = 0, velocityDecay = .6, forces = /* @__PURE__ */ new Map(), stepper = timer(step), event = dispatch("tick", "end"), random = lcg_default();
		if (nodes == null) nodes = [];
		function step() {
			tick();
			event.call("tick", simulation);
			if (alpha < alphaMin) {
				stepper.stop();
				event.call("end", simulation);
			}
		}
		function tick(iterations) {
			var i, n = nodes.length, node;
			if (iterations === void 0) iterations = 1;
			for (var k = 0; k < iterations; ++k) {
				alpha += (alphaTarget - alpha) * alphaDecay;
				forces.forEach(function(force) {
					force(alpha);
				});
				for (i = 0; i < n; ++i) {
					node = nodes[i];
					if (node.fx == null) node.x += node.vx *= velocityDecay;
					else node.x = node.fx, node.vx = 0;
					if (node.fy == null) node.y += node.vy *= velocityDecay;
					else node.y = node.fy, node.vy = 0;
				}
			}
			return simulation;
		}
		function initializeNodes() {
			for (var i = 0, n = nodes.length, node; i < n; ++i) {
				node = nodes[i], node.index = i;
				if (node.fx != null) node.x = node.fx;
				if (node.fy != null) node.y = node.fy;
				if (isNaN(node.x) || isNaN(node.y)) {
					var radius = initialRadius * Math.sqrt(.5 + i), angle = i * initialAngle;
					node.x = radius * Math.cos(angle);
					node.y = radius * Math.sin(angle);
				}
				if (isNaN(node.vx) || isNaN(node.vy)) node.vx = node.vy = 0;
			}
		}
		function initializeForce(force) {
			if (force.initialize) force.initialize(nodes, random);
			return force;
		}
		initializeNodes();
		return simulation = {
			tick,
			restart: function() {
				return stepper.restart(step), simulation;
			},
			stop: function() {
				return stepper.stop(), simulation;
			},
			nodes: function(_) {
				return arguments.length ? (nodes = _, initializeNodes(), forces.forEach(initializeForce), simulation) : nodes;
			},
			alpha: function(_) {
				return arguments.length ? (alpha = +_, simulation) : alpha;
			},
			alphaMin: function(_) {
				return arguments.length ? (alphaMin = +_, simulation) : alphaMin;
			},
			alphaDecay: function(_) {
				return arguments.length ? (alphaDecay = +_, simulation) : +alphaDecay;
			},
			alphaTarget: function(_) {
				return arguments.length ? (alphaTarget = +_, simulation) : alphaTarget;
			},
			velocityDecay: function(_) {
				return arguments.length ? (velocityDecay = 1 - _, simulation) : 1 - velocityDecay;
			},
			randomSource: function(_) {
				return arguments.length ? (random = _, forces.forEach(initializeForce), simulation) : random;
			},
			force: function(name, _) {
				return arguments.length > 1 ? (_ == null ? forces.delete(name) : forces.set(name, initializeForce(_)), simulation) : forces.get(name);
			},
			find: function(x, y, radius) {
				var i = 0, n = nodes.length, dx, dy, d2, node, closest;
				if (radius == null) radius = Infinity;
				else radius *= radius;
				for (i = 0; i < n; ++i) {
					node = nodes[i];
					dx = x - node.x;
					dy = y - node.y;
					d2 = dx * dx + dy * dy;
					if (d2 < radius) closest = node, radius = d2;
				}
				return closest;
			},
			on: function(name, _) {
				return arguments.length > 1 ? (event.on(name, _), simulation) : event.on(name);
			}
		};
	}

//#endregion
//#region node_modules/.pnpm/d3-force@3.0.0/node_modules/d3-force/src/manyBody.js
	function manyBody_default() {
		var nodes, node, random, alpha, strength = constant_default$1(-30), strengths, distanceMin2 = 1, distanceMax2 = Infinity, theta2 = .81;
		function force(_) {
			var i, n = nodes.length, tree = quadtree(nodes, x, y).visitAfter(accumulate);
			for (alpha = _, i = 0; i < n; ++i) node = nodes[i], tree.visit(apply);
		}
		function initialize() {
			if (!nodes) return;
			var i, n = nodes.length, node;
			strengths = new Array(n);
			for (i = 0; i < n; ++i) node = nodes[i], strengths[node.index] = +strength(node, i, nodes);
		}
		function accumulate(quad) {
			var strength = 0, q, c, weight = 0, x, y, i;
			if (quad.length) {
				for (x = y = i = 0; i < 4; ++i) if ((q = quad[i]) && (c = Math.abs(q.value))) strength += q.value, weight += c, x += c * q.x, y += c * q.y;
				quad.x = x / weight;
				quad.y = y / weight;
			} else {
				q = quad;
				q.x = q.data.x;
				q.y = q.data.y;
				do
					strength += strengths[q.data.index];
				while (q = q.next);
			}
			quad.value = strength;
		}
		function apply(quad, x1, _, x2) {
			if (!quad.value) return true;
			var x = quad.x - node.x, y = quad.y - node.y, w = x2 - x1, l = x * x + y * y;
			if (w * w / theta2 < l) {
				if (l < distanceMax2) {
					if (x === 0) x = jiggle_default(random), l += x * x;
					if (y === 0) y = jiggle_default(random), l += y * y;
					if (l < distanceMin2) l = Math.sqrt(distanceMin2 * l);
					node.vx += x * quad.value * alpha / l;
					node.vy += y * quad.value * alpha / l;
				}
				return true;
			} else if (quad.length || l >= distanceMax2) return;
			if (quad.data !== node || quad.next) {
				if (x === 0) x = jiggle_default(random), l += x * x;
				if (y === 0) y = jiggle_default(random), l += y * y;
				if (l < distanceMin2) l = Math.sqrt(distanceMin2 * l);
			}
			do
				if (quad.data !== node) {
					w = strengths[quad.data.index] * alpha / l;
					node.vx += x * w;
					node.vy += y * w;
				}
			while (quad = quad.next);
		}
		force.initialize = function(_nodes, _random) {
			nodes = _nodes;
			random = _random;
			initialize();
		};
		force.strength = function(_) {
			return arguments.length ? (strength = typeof _ === "function" ? _ : constant_default$1(+_), initialize(), force) : strength;
		};
		force.distanceMin = function(_) {
			return arguments.length ? (distanceMin2 = _ * _, force) : Math.sqrt(distanceMin2);
		};
		force.distanceMax = function(_) {
			return arguments.length ? (distanceMax2 = _ * _, force) : Math.sqrt(distanceMax2);
		};
		force.theta = function(_) {
			return arguments.length ? (theta2 = _ * _, force) : Math.sqrt(theta2);
		};
		return force;
	}

//#endregion
//#region node_modules/.pnpm/d3-shape@3.2.0/node_modules/d3-shape/src/constant.js
	function constant_default(x) {
		return function constant() {
			return x;
		};
	}

//#endregion
//#region node_modules/.pnpm/d3-shape@3.2.0/node_modules/d3-shape/src/math.js
	const abs = Math.abs;
	const atan2 = Math.atan2;
	const cos = Math.cos;
	const max = Math.max;
	const min = Math.min;
	const sin = Math.sin;
	const sqrt = Math.sqrt;
	const epsilon = 1e-12;
	const pi = Math.PI;
	const halfPi = pi / 2;
	const tau = 2 * pi;
	function acos(x) {
		return x > 1 ? 0 : x < -1 ? pi : Math.acos(x);
	}
	function asin(x) {
		return x >= 1 ? halfPi : x <= -1 ? -halfPi : Math.asin(x);
	}

//#endregion
//#region node_modules/.pnpm/d3-shape@3.2.0/node_modules/d3-shape/src/path.js
	function withPath(shape) {
		let digits = 3;
		shape.digits = function(_) {
			if (!arguments.length) return digits;
			if (_ == null) digits = null;
			else {
				const d = Math.floor(_);
				if (!(d >= 0)) throw new RangeError(`invalid digits: ${_}`);
				digits = d;
			}
			return shape;
		};
		return () => new Path(digits);
	}

//#endregion
//#region node_modules/.pnpm/d3-shape@3.2.0/node_modules/d3-shape/src/arc.js
	function arcInnerRadius(d) {
		return d.innerRadius;
	}
	function arcOuterRadius(d) {
		return d.outerRadius;
	}
	function arcStartAngle(d) {
		return d.startAngle;
	}
	function arcEndAngle(d) {
		return d.endAngle;
	}
	function arcPadAngle(d) {
		return d && d.padAngle;
	}
	function intersect(x0, y0, x1, y1, x2, y2, x3, y3) {
		var x10 = x1 - x0, y10 = y1 - y0, x32 = x3 - x2, y32 = y3 - y2, t = y32 * x10 - x32 * y10;
		if (t * t < 1e-12) return;
		t = (x32 * (y0 - y2) - y32 * (x0 - x2)) / t;
		return [x0 + t * x10, y0 + t * y10];
	}
	function cornerTangents(x0, y0, x1, y1, r1, rc, cw) {
		var x01 = x0 - x1, y01 = y0 - y1, lo = (cw ? rc : -rc) / sqrt(x01 * x01 + y01 * y01), ox = lo * y01, oy = -lo * x01, x11 = x0 + ox, y11 = y0 + oy, x10 = x1 + ox, y10 = y1 + oy, x00 = (x11 + x10) / 2, y00 = (y11 + y10) / 2, dx = x10 - x11, dy = y10 - y11, d2 = dx * dx + dy * dy, r = r1 - rc, D = x11 * y10 - x10 * y11, d = (dy < 0 ? -1 : 1) * sqrt(max(0, r * r * d2 - D * D)), cx0 = (D * dy - dx * d) / d2, cy0 = (-D * dx - dy * d) / d2, cx1 = (D * dy + dx * d) / d2, cy1 = (-D * dx + dy * d) / d2, dx0 = cx0 - x00, dy0 = cy0 - y00, dx1 = cx1 - x00, dy1 = cy1 - y00;
		if (dx0 * dx0 + dy0 * dy0 > dx1 * dx1 + dy1 * dy1) cx0 = cx1, cy0 = cy1;
		return {
			cx: cx0,
			cy: cy0,
			x01: -ox,
			y01: -oy,
			x11: cx0 * (r1 / r - 1),
			y11: cy0 * (r1 / r - 1)
		};
	}
	function arc_default() {
		var innerRadius = arcInnerRadius, outerRadius = arcOuterRadius, cornerRadius = constant_default(0), padRadius = null, startAngle = arcStartAngle, endAngle = arcEndAngle, padAngle = arcPadAngle, context = null, path = withPath(arc);
		function arc() {
			var buffer, r, r0 = +innerRadius.apply(this, arguments), r1 = +outerRadius.apply(this, arguments), a0 = startAngle.apply(this, arguments) - halfPi, a1 = endAngle.apply(this, arguments) - halfPi, da = abs(a1 - a0), cw = a1 > a0;
			if (!context) context = buffer = path();
			if (r1 < r0) r = r1, r1 = r0, r0 = r;
			if (!(r1 > 1e-12)) context.moveTo(0, 0);
			else if (da > tau - 1e-12) {
				context.moveTo(r1 * cos(a0), r1 * sin(a0));
				context.arc(0, 0, r1, a0, a1, !cw);
				if (r0 > 1e-12) {
					context.moveTo(r0 * cos(a1), r0 * sin(a1));
					context.arc(0, 0, r0, a1, a0, cw);
				}
			} else {
				var a01 = a0, a11 = a1, a00 = a0, a10 = a1, da0 = da, da1 = da, ap = padAngle.apply(this, arguments) / 2, rp = ap > 1e-12 && (padRadius ? +padRadius.apply(this, arguments) : sqrt(r0 * r0 + r1 * r1)), rc = min(abs(r1 - r0) / 2, +cornerRadius.apply(this, arguments)), rc0 = rc, rc1 = rc, t0, t1;
				if (rp > 1e-12) {
					var p0 = asin(rp / r0 * sin(ap)), p1 = asin(rp / r1 * sin(ap));
					if ((da0 -= p0 * 2) > 1e-12) p0 *= cw ? 1 : -1, a00 += p0, a10 -= p0;
					else da0 = 0, a00 = a10 = (a0 + a1) / 2;
					if ((da1 -= p1 * 2) > 1e-12) p1 *= cw ? 1 : -1, a01 += p1, a11 -= p1;
					else da1 = 0, a01 = a11 = (a0 + a1) / 2;
				}
				var x01 = r1 * cos(a01), y01 = r1 * sin(a01), x10 = r0 * cos(a10), y10 = r0 * sin(a10);
				if (rc > 1e-12) {
					var x11 = r1 * cos(a11), y11 = r1 * sin(a11), x00 = r0 * cos(a00), y00 = r0 * sin(a00), oc;
					if (da < pi) if (oc = intersect(x01, y01, x00, y00, x11, y11, x10, y10)) {
						var ax = x01 - oc[0], ay = y01 - oc[1], bx = x11 - oc[0], by = y11 - oc[1], kc = 1 / sin(acos((ax * bx + ay * by) / (sqrt(ax * ax + ay * ay) * sqrt(bx * bx + by * by))) / 2), lc = sqrt(oc[0] * oc[0] + oc[1] * oc[1]);
						rc0 = min(rc, (r0 - lc) / (kc - 1));
						rc1 = min(rc, (r1 - lc) / (kc + 1));
					} else rc0 = rc1 = 0;
				}
				if (!(da1 > 1e-12)) context.moveTo(x01, y01);
				else if (rc1 > 1e-12) {
					t0 = cornerTangents(x00, y00, x01, y01, r1, rc1, cw);
					t1 = cornerTangents(x11, y11, x10, y10, r1, rc1, cw);
					context.moveTo(t0.cx + t0.x01, t0.cy + t0.y01);
					if (rc1 < rc) context.arc(t0.cx, t0.cy, rc1, atan2(t0.y01, t0.x01), atan2(t1.y01, t1.x01), !cw);
					else {
						context.arc(t0.cx, t0.cy, rc1, atan2(t0.y01, t0.x01), atan2(t0.y11, t0.x11), !cw);
						context.arc(0, 0, r1, atan2(t0.cy + t0.y11, t0.cx + t0.x11), atan2(t1.cy + t1.y11, t1.cx + t1.x11), !cw);
						context.arc(t1.cx, t1.cy, rc1, atan2(t1.y11, t1.x11), atan2(t1.y01, t1.x01), !cw);
					}
				} else context.moveTo(x01, y01), context.arc(0, 0, r1, a01, a11, !cw);
				if (!(r0 > 1e-12) || !(da0 > 1e-12)) context.lineTo(x10, y10);
				else if (rc0 > 1e-12) {
					t0 = cornerTangents(x10, y10, x11, y11, r0, -rc0, cw);
					t1 = cornerTangents(x01, y01, x00, y00, r0, -rc0, cw);
					context.lineTo(t0.cx + t0.x01, t0.cy + t0.y01);
					if (rc0 < rc) context.arc(t0.cx, t0.cy, rc0, atan2(t0.y01, t0.x01), atan2(t1.y01, t1.x01), !cw);
					else {
						context.arc(t0.cx, t0.cy, rc0, atan2(t0.y01, t0.x01), atan2(t0.y11, t0.x11), !cw);
						context.arc(0, 0, r0, atan2(t0.cy + t0.y11, t0.cx + t0.x11), atan2(t1.cy + t1.y11, t1.cx + t1.x11), cw);
						context.arc(t1.cx, t1.cy, rc0, atan2(t1.y11, t1.x11), atan2(t1.y01, t1.x01), !cw);
					}
				} else context.arc(0, 0, r0, a10, a00, cw);
			}
			context.closePath();
			if (buffer) return context = null, buffer + "" || null;
		}
		arc.centroid = function() {
			var r = (+innerRadius.apply(this, arguments) + +outerRadius.apply(this, arguments)) / 2, a = (+startAngle.apply(this, arguments) + +endAngle.apply(this, arguments)) / 2 - pi / 2;
			return [cos(a) * r, sin(a) * r];
		};
		arc.innerRadius = function(_) {
			return arguments.length ? (innerRadius = typeof _ === "function" ? _ : constant_default(+_), arc) : innerRadius;
		};
		arc.outerRadius = function(_) {
			return arguments.length ? (outerRadius = typeof _ === "function" ? _ : constant_default(+_), arc) : outerRadius;
		};
		arc.cornerRadius = function(_) {
			return arguments.length ? (cornerRadius = typeof _ === "function" ? _ : constant_default(+_), arc) : cornerRadius;
		};
		arc.padRadius = function(_) {
			return arguments.length ? (padRadius = _ == null ? null : typeof _ === "function" ? _ : constant_default(+_), arc) : padRadius;
		};
		arc.startAngle = function(_) {
			return arguments.length ? (startAngle = typeof _ === "function" ? _ : constant_default(+_), arc) : startAngle;
		};
		arc.endAngle = function(_) {
			return arguments.length ? (endAngle = typeof _ === "function" ? _ : constant_default(+_), arc) : endAngle;
		};
		arc.padAngle = function(_) {
			return arguments.length ? (padAngle = typeof _ === "function" ? _ : constant_default(+_), arc) : padAngle;
		};
		arc.context = function(_) {
			return arguments.length ? (context = _ == null ? null : _, arc) : context;
		};
		return arc;
	}

//#endregion
//#region node_modules/.pnpm/d3-shape@3.2.0/node_modules/d3-shape/src/symbol/circle.js
	var circle_default = { draw(context, size) {
		const r = sqrt(size / pi);
		context.moveTo(r, 0);
		context.arc(0, 0, r, 0, tau);
	} };

//#endregion
//#region node_modules/.pnpm/d3-shape@3.2.0/node_modules/d3-shape/src/symbol/cross.js
	var cross_default = { draw(context, size) {
		const r = sqrt(size / 5) / 2;
		context.moveTo(-3 * r, -r);
		context.lineTo(-r, -r);
		context.lineTo(-r, -3 * r);
		context.lineTo(r, -3 * r);
		context.lineTo(r, -r);
		context.lineTo(3 * r, -r);
		context.lineTo(3 * r, r);
		context.lineTo(r, r);
		context.lineTo(r, 3 * r);
		context.lineTo(-r, 3 * r);
		context.lineTo(-r, r);
		context.lineTo(-3 * r, r);
		context.closePath();
	} };

//#endregion
//#region node_modules/.pnpm/d3-shape@3.2.0/node_modules/d3-shape/src/symbol/diamond.js
	const tan30 = sqrt(1 / 3);
	const tan30_2 = tan30 * 2;
	var diamond_default = { draw(context, size) {
		const y = sqrt(size / tan30_2);
		const x = y * tan30;
		context.moveTo(0, -y);
		context.lineTo(x, 0);
		context.lineTo(0, y);
		context.lineTo(-x, 0);
		context.closePath();
	} };

//#endregion
//#region node_modules/.pnpm/d3-shape@3.2.0/node_modules/d3-shape/src/symbol/square.js
	var square_default = { draw(context, size) {
		const w = sqrt(size);
		const x = -w / 2;
		context.rect(x, x, w, w);
	} };

//#endregion
//#region node_modules/.pnpm/d3-shape@3.2.0/node_modules/d3-shape/src/symbol/star.js
	const ka = .8908130915292852;
	const kr = sin(pi / 10) / sin(7 * pi / 10);
	const kx = sin(tau / 10) * kr;
	const ky = -cos(tau / 10) * kr;
	var star_default = { draw(context, size) {
		const r = sqrt(size * ka);
		const x = kx * r;
		const y = ky * r;
		context.moveTo(0, -r);
		context.lineTo(x, y);
		for (let i = 1; i < 5; ++i) {
			const a = tau * i / 5;
			const c = cos(a);
			const s = sin(a);
			context.lineTo(s * r, -c * r);
			context.lineTo(c * x - s * y, s * x + c * y);
		}
		context.closePath();
	} };

//#endregion
//#region node_modules/.pnpm/d3-shape@3.2.0/node_modules/d3-shape/src/symbol/triangle.js
	const sqrt3 = sqrt(3);
	var triangle_default = { draw(context, size) {
		const y = -sqrt(size / (sqrt3 * 3));
		context.moveTo(0, y * 2);
		context.lineTo(-sqrt3 * y, -y);
		context.lineTo(sqrt3 * y, -y);
		context.closePath();
	} };

//#endregion
//#region node_modules/.pnpm/d3-shape@3.2.0/node_modules/d3-shape/src/symbol/wye.js
	const c = -.5;
	const s = sqrt(3) / 2;
	const k = 1 / sqrt(12);
	const a = (k / 2 + 1) * 3;
	var wye_default = { draw(context, size) {
		const r = sqrt(size / a);
		const x0 = r / 2, y0 = r * k;
		const x1 = x0, y1 = r * k + r;
		const x2 = -x1, y2 = y1;
		context.moveTo(x0, y0);
		context.lineTo(x1, y1);
		context.lineTo(x2, y2);
		context.lineTo(c * x0 - s * y0, s * x0 + c * y0);
		context.lineTo(c * x1 - s * y1, s * x1 + c * y1);
		context.lineTo(c * x2 - s * y2, s * x2 + c * y2);
		context.lineTo(c * x0 + s * y0, c * y0 - s * x0);
		context.lineTo(c * x1 + s * y1, c * y1 - s * x1);
		context.lineTo(c * x2 + s * y2, c * y2 - s * x2);
		context.closePath();
	} };

//#endregion
//#region node_modules/.pnpm/d3-shape@3.2.0/node_modules/d3-shape/src/symbol.js
	function Symbol$1(type, size) {
		let context = null, path = withPath(symbol);
		type = typeof type === "function" ? type : constant_default(type || circle_default);
		size = typeof size === "function" ? size : constant_default(size === void 0 ? 64 : +size);
		function symbol() {
			let buffer;
			if (!context) context = buffer = path();
			type.apply(this, arguments).draw(context, +size.apply(this, arguments));
			if (buffer) return context = null, buffer + "" || null;
		}
		symbol.type = function(_) {
			return arguments.length ? (type = typeof _ === "function" ? _ : constant_default(_), symbol) : type;
		};
		symbol.size = function(_) {
			return arguments.length ? (size = typeof _ === "function" ? _ : constant_default(+_), symbol) : size;
		};
		symbol.context = function(_) {
			return arguments.length ? (context = _ == null ? null : _, symbol) : context;
		};
		return symbol;
	}

//#endregion
//#region node_modules/.pnpm/d3-zoom@3.0.0/node_modules/d3-zoom/src/transform.js
	function Transform(k, x, y) {
		this.k = k;
		this.x = x;
		this.y = y;
	}
	Transform.prototype = {
		constructor: Transform,
		scale: function(k) {
			return k === 1 ? this : new Transform(this.k * k, this.x, this.y);
		},
		translate: function(x, y) {
			return x === 0 & y === 0 ? this : new Transform(this.k, this.x + this.k * x, this.y + this.k * y);
		},
		apply: function(point) {
			return [point[0] * this.k + this.x, point[1] * this.k + this.y];
		},
		applyX: function(x) {
			return x * this.k + this.x;
		},
		applyY: function(y) {
			return y * this.k + this.y;
		},
		invert: function(location) {
			return [(location[0] - this.x) / this.k, (location[1] - this.y) / this.k];
		},
		invertX: function(x) {
			return (x - this.x) / this.k;
		},
		invertY: function(y) {
			return (y - this.y) / this.k;
		},
		rescaleX: function(x) {
			return x.copy().domain(x.range().map(this.invertX, this).map(x.invert, x));
		},
		rescaleY: function(y) {
			return y.copy().domain(y.range().map(this.invertY, this).map(y.invert, y));
		},
		toString: function() {
			return "translate(" + this.x + "," + this.y + ") scale(" + this.k + ")";
		}
	};
	var identity = new Transform(1, 0, 0);
	transform.prototype = Transform.prototype;
	function transform(node) {
		while (!node.__zoom) if (!(node = node.parentNode)) return identity;
		return node.__zoom;
	}

//#endregion
//#region vis/color.ts
/**
	* Convert an oklch() CSS color string to #rrggbb hex.
	* Falls through unchanged if the input is not an oklch color.
	*
	* Math: oklch → oklab → linear sRGB → gamma-corrected sRGB → hex.
	* Reference: https://www.w3.org/TR/css-color-4/#oklab-to-srgb
	*/
	function oklchToHex(c) {
		if (!c.startsWith("oklch(")) return c;
		const m = c.match(/oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*(?:\/\s*([\d.]+))?\)/);
		if (!m) return c;
		const L = parseFloat(m[1]);
		const C = parseFloat(m[2]);
		const H = parseFloat(m[3]);
		const alpha = m[4] ? parseFloat(m[4]) : 1;
		const hRad = H * Math.PI / 180;
		const a = C * Math.cos(hRad);
		const b = C * Math.sin(hRad);
		const l_ = L + .3963377774 * a + .2158037573 * b;
		const m_ = L - .1055613458 * a - .0638541728 * b;
		const s_ = L - .0894841775 * a - 1.291485548 * b;
		const l3 = l_ * l_ * l_;
		const m3 = m_ * m_ * m_;
		const s3 = s_ * s_ * s_;
		const rLin = 4.0767416621 * l3 - 3.3077115913 * m3 + .2309699292 * s3;
		const gLin = -1.2684380046 * l3 + 2.6097574011 * m3 - .3413193965 * s3;
		const bLin = -.0041960863 * l3 - .7034186147 * m3 + 1.707614701 * s3;
		const toSRGB = (v) => {
			const abs = Math.abs(v);
			return abs <= .0031308 ? 12.92 * v : 1.055 * Math.pow(abs, 1 / 2.4) - .055;
		};
		const clamp = (v) => Math.max(0, Math.min(255, Math.round(v * 255)));
		const R = clamp(toSRGB(rLin));
		const G = clamp(toSRGB(gLin));
		const B = clamp(toSRGB(bLin));
		const hex = "#" + [
			R,
			G,
			B
		].map((v) => v.toString(16).padStart(2, "0")).join("");
		if (alpha < 1) {
			const blend = (c) => Math.round(c * alpha + 255 * (1 - alpha));
			return "#" + [
				blend(R),
				blend(G),
				blend(B)
			].map((v) => v.toString(16).padStart(2, "0")).join("");
		}
		return hex;
	}
	/**
	* Ensure a color value is safe for SVG attributes.
	* Converts oklch → hex; passes everything else through unchanged.
	* Also handles the CSS `var(--xxx)` and `none` keywords.
	*/
	function svgColor(c) {
		if (!c) return c ?? "";
		if (c.startsWith("var(") || c === "none" || c.startsWith("#")) return c;
		if (c.startsWith("oklch(")) return oklchToHex(c);
		return c;
	}

//#endregion
//#region vis/primitives.ts
/** 为形状绘制光晕背景（半透明圆角矩形） */
	const halo = (g, cx, cy, w, h, rx, { pad = 6, fill = svgColor("oklch(0.92 0.015 75)"), stroke = svgColor("oklch(0.55 0.02 65 / 0.22)"), strokeWidth = 1.5, id = "h" } = {}) => {
		const did = `halo-${id}`;
		g.selectAll(`[data-id="${did}"]`).remove();
		return g.append("rect").attr("data-id", did).attr("class", "h").attr("x", cx - w / 2 - pad).attr("y", cy - h / 2 - pad).attr("width", w + pad * 2).attr("height", h + pad * 2).attr("rx", rx + pad * .66).attr("fill", svgColor(fill)).attr("stroke", svgColor(stroke)).attr("stroke-width", strokeWidth);
	};
	/** SVG 文本标签，支持 paintOrder（描边扩边可读性） */
	const svgLabel = (g, x, y, text, { size = 14, fill = "var(--text)", weight = 700, anchor = "middle", font = "JetBrains Mono,monospace", paintOrder = false, id = "lbl" } = {}) => {
		const did = `label-${id}`;
		g.selectAll(`[data-id="${did}"]`).remove();
		const el = g.append("text").attr("data-id", did).attr("x", x).attr("y", y).attr("text-anchor", anchor).style("font-family", font).style("font-size", size + "px").style("font-weight", weight).style("fill", fill).text(text);
		if (paintOrder) el.style("paint-order", "stroke").style("stroke", "#fff").style("stroke-width", "3");
		return el;
	};
	const MARKER = {
		viewW: 12,
		viewH: 10,
		refX: 4,
		refY: 5,
		sw: 2
	};
	/** Distance from refX to marker tip in SVG pixels: (viewW – refX) × (markerW / viewW) */
	const markerTip = (m = MARKER) => (m.viewW - m.refX) * (m.sw * 7 / m.viewW);
	/** 定义 SVG marker 箭头工厂。每种颜色一个 marker，fill 显式 = 边的 stroke */
	const defineArrows = (svg, { sw = MARKER.sw, refX = MARKER.refX, refY = MARKER.refY } = {}) => {
		if (svg.select("defs").empty()) svg.append("defs");
		const defs = svg.select("defs");
		const mw = sw * 7;
		const _cache = {};
		const markerFor = (color) => {
			const c = color || "#888";
			if (!_cache[c]) {
				const id = "ar" + Object.keys(_cache).length;
				defs.append("marker").attr("id", id).attr("viewBox", "0 0 12 10").attr("refX", refX).attr("refY", refY).attr("markerWidth", mw).attr("markerHeight", mw).attr("markerUnits", "userSpaceOnUse").attr("orient", "auto-start-reverse").append("path").attr("d", "M0,0.5 L12,5 L0,9.5 Z").attr("fill", svgColor(c));
				_cache[c] = id;
			}
			return `url(#${_cache[c]})`;
		};
		return { markerFor };
	};
	/** 在容器内创建 SVG + 4 图层（bg/edges/nodes/overlay）+ 标签覆盖层 */
	const createCanvas = (selector, width = 560, height = 400, margin = 48) => {
		const root = select_default$1(selector);
		root.style("position", "relative");
		const svg = root.append("svg").attr("viewBox", `0 0 ${width} ${height}`).attr("preserveAspectRatio", "xMidYMid meet").style("width", "100%").style("display", "block");
		return {
			svg,
			root,
			lbl: root.append("div").attr("class", "vis-labels").style("position", "absolute").style("top", "0").style("left", "0").style("width", "100%").style("height", "100%").style("pointer-events", "none"),
			bg: svg.append("g"),
			eG: svg.append("g"),
			nG: svg.append("g"),
			oG: svg.append("g"),
			W: width,
			H: height,
			M: margin
		};
	};
	const isD3Selection = (v) => {
		if (typeof v !== "object" || v === null) return false;
		if (!("node" in v)) return false;
		return typeof v.node === "function";
	};
	const isSVGGraphics = (v) => {
		if (v instanceof SVGGraphicsElement) return true;
		if (typeof v !== "object" || v === null) return false;
		if (!("getBBox" in v)) return false;
		return typeof v.getBBox === "function";
	};
	const emptySelection = () => select_default$1(document.createElement("div")).remove();
	const domLabel = (container, anchor, html, opts = {}) => {
		const svgNode = container.select("svg").node();
		if (!svgNode || !(svgNode instanceof SVGSVGElement)) return emptySelection();
		const { offsetX = 0, offsetY = 0, place = "above", gap = 8, className = "vlbl", style = {} } = opts;
		let b;
		if (isD3Selection(anchor)) {
			const el = anchor.node();
			if (el && isSVGGraphics(el)) {
				const bb = el.getBBox();
				b = {
					left: bb.x,
					top: bb.y,
					w: bb.width,
					h: bb.height,
					cx: bb.x + bb.width / 2,
					cy: bb.y + bb.height / 2
				};
			}
		} else if (isSVGGraphics(anchor)) {
			const bb = anchor.getBBox();
			b = {
				left: bb.x,
				top: bb.y,
				w: bb.width,
				h: bb.height,
				cx: bb.x + bb.width / 2,
				cy: bb.y + bb.height / 2
			};
		} else if (anchor && typeof anchor === "object" && "x" in anchor) {
			const a = anchor;
			const hw = (a.nW || a.w || 0) / 2, hh = (a.nH || a.h || 0) / 2;
			const bw = a.nW || a.w || 0, bh = a.nH || a.h || 0;
			if (a.r !== void 0) b = {
				left: a.x - a.r,
				top: a.y - a.r,
				w: a.r * 2,
				h: a.r * 2,
				cx: a.x,
				cy: a.y
			};
			else b = {
				left: a.x - hw,
				top: a.y - hh,
				w: bw,
				h: bh,
				cx: a.x,
				cy: a.y
			};
		} else return emptySelection();
		if (!b) return emptySelection();
		const vb = svgNode.viewBox.baseVal;
		const gx = (v) => v / vb.width * 100, gy = (v) => v / vb.height * 100;
		let left, top, tx = "translate(-50%, -50%)";
		if (place === "right") {
			left = gx(b.left + b.w + gap);
			top = gy(b.cy);
			tx = "translate(0%, -50%)";
		} else if (place === "left") {
			left = gx(b.left - gap);
			top = gy(b.cy);
			tx = "translate(-100%, -50%)";
		} else if (place === "below") {
			left = gx(b.cx);
			top = gy(b.top + b.h + gap);
			tx = "translate(-50%, 0%)";
		} else if (place === "above") {
			left = gx(b.cx);
			top = gy(b.top - gap);
			tx = "translate(-50%, -100%)";
		} else {
			left = gx(b.cx);
			top = gy(b.cy);
		}
		let inner = html;
		if (typeof window !== "undefined" && window.katex) {
			inner = html.replace(/\$\$([^$]+)\$\$/g, (_, m) => window.katex.renderToString(m, {
				throwOnError: false,
				displayMode: true
			}));
			inner = inner.replace(/\$([^$]+)\$/g, (_, m) => window.katex.renderToString(m, { throwOnError: false }));
		}
		const div = container.append("div").attr("class", className).style("position", "absolute").style("pointer-events", "none").style("left", left + offsetX / vb.width * 100 + "%").style("top", top + offsetY / vb.height * 100 + "%").style("transform", tx).html(inner);
		for (const [k, v] of Object.entries(style)) div.style(k, v);
		return div;
	};

//#endregion
//#region vis/stepper.ts
/**
	* Create stepper buttons in a container element.
	*
	* @param container - CSS selector or HTMLElement to hold buttons
	* @param labels - button labels
	* @param onChange - called with step index when user clicks a button
	* @param opts.start - initial active step (default 0)
	*/
	function stepper(container, labels, onChange, opts) {
		const ct = typeof container === "string" ? document.querySelector(container) : container;
		if (!ct) throw new Error(`Stepper container not found: ${container}`);
		const start = opts?.start ?? 0;
		const buttons = [];
		ct.innerHTML = "";
		for (let i = 0; i < labels.length; i++) {
			const btn = document.createElement("button");
			btn.textContent = labels[i];
			if (i === start) btn.classList.add("active");
			btn.addEventListener("click", () => go(i));
			ct.appendChild(btn);
			buttons.push(btn);
		}
		function go(i) {
			if (i < 0 || i >= labels.length) return;
			buttons.forEach((b, j) => b.classList.toggle("active", j === i));
			onChange(i);
		}
		function destroy() {
			ct.innerHTML = "";
			buttons.length = 0;
		}
		return {
			go,
			destroy
		};
	}

//#endregion
//#region vis/katex.ts
	const katexify = (html) => {
		if (typeof window === "undefined" || !window.katex) return html;
		return html.replace(/\$\$([^$]+)\$\$/g, (_, m) => window.katex.renderToString(m, {
			throwOnError: false,
			displayMode: true
		})).replace(/\$([^$]+)\$/g, (_, m) => window.katex.renderToString(m, { throwOnError: false }));
	};

//#endregion
//#region vis/bootstrap.ts
	function bootstrap(selector, opts = {}) {
		const { width = 560, height = 400, margin = 48, geom: gOpts = {} } = opts;
		const C = createCanvas(selector, width, height, margin);
		const p = palette();
		const geom = Object.freeze({
			nW: 34,
			nH: 26,
			dR: 8,
			rx: 5,
			gap: 4,
			...gOpts
		});
		const { markerFor } = defineArrows(C.svg, { sw: 2 });
		const callout = (anchor, html, o = {}) => domLabel(C.root, anchor, html, o);
		return {
			svg: C.svg,
			W: C.W,
			H: C.H,
			M: C.M,
			stage: {
				bg: C.bg,
				nodes: C.nG,
				edges: C.eG,
				overlay: C.oG
			},
			root: C.root,
			palette: p,
			geom,
			markerFor,
			callout
		};
	}

//#endregion
//#region vis/themes.ts
	const themes = {
		warm: {
			name: "warm",
			desc: "暖色调 · 教学友好 · 琥珀+青",
			palette: {
				primary: {
					fg: "oklch(0.55 0.20 55)",
					bg: "oklch(0.88 0.08 55)"
				},
				accent: {
					fg: "oklch(0.57 0.15 180)",
					bg: "oklch(0.88 0.06 180)"
				},
				danger: {
					fg: "oklch(0.48 0.18 22)",
					bg: "oklch(0.88 0.04 22)"
				},
				warning: {
					fg: "oklch(0.58 0.20 85)",
					bg: "oklch(0.90 0.08 85)"
				},
				info: {
					fg: "oklch(0.50 0.12 240)",
					bg: "oklch(0.88 0.04 240)"
				},
				dim: {
					fg: "oklch(0.50 0.02 60)",
					bg: "oklch(0.90 0.01 75)"
				},
				muted: {
					fg: "oklch(0.50 0.02 60)",
					bg: "oklch(0.90 0.01 75)"
				},
				success: {
					fg: "oklch(0.48 0.18 150)",
					bg: "oklch(0.88 0.06 150)"
				}
			}
		},
		cool: {
			name: "cool",
			desc: "冷色调 · 科技感 · 蓝+薄荷",
			palette: {
				primary: {
					fg: "oklch(0.52 0.14 250)",
					bg: "oklch(0.88 0.05 250)"
				},
				accent: {
					fg: "oklch(0.55 0.11 160)",
					bg: "oklch(0.88 0.05 160)"
				},
				danger: {
					fg: "oklch(0.50 0.16 10)",
					bg: "oklch(0.88 0.04 10)"
				},
				warning: {
					fg: "oklch(0.58 0.18 90)",
					bg: "oklch(0.90 0.06 90)"
				},
				info: {
					fg: "oklch(0.48 0.10 250)",
					bg: "oklch(0.88 0.04 250)"
				},
				dim: {
					fg: "oklch(0.50 0.02 250)",
					bg: "oklch(0.90 0.01 250)"
				},
				muted: {
					fg: "oklch(0.50 0.02 250)",
					bg: "oklch(0.90 0.01 250)"
				},
				success: {
					fg: "oklch(0.50 0.14 150)",
					bg: "oklch(0.88 0.05 150)"
				}
			}
		},
		dark: {
			name: "dark",
			desc: "暗色 · 终端风 · 亮色前景",
			palette: {
				primary: {
					fg: "oklch(0.72 0.16 65)",
					bg: "oklch(0.28 0.05 65)"
				},
				accent: {
					fg: "oklch(0.68 0.13 155)",
					bg: "oklch(0.24 0.05 155)"
				},
				danger: {
					fg: "oklch(0.62 0.16 25)",
					bg: "oklch(0.24 0.04 25)"
				},
				warning: {
					fg: "oklch(0.72 0.18 85)",
					bg: "oklch(0.26 0.05 85)"
				},
				info: {
					fg: "oklch(0.62 0.12 240)",
					bg: "oklch(0.24 0.04 240)"
				},
				dim: {
					fg: "oklch(0.50 0.03 260)",
					bg: "oklch(0.22 0.01 260)"
				},
				muted: {
					fg: "oklch(0.50 0.03 260)",
					bg: "oklch(0.22 0.01 260)"
				},
				success: {
					fg: "oklch(0.62 0.15 150)",
					bg: "oklch(0.26 0.05 150)"
				}
			}
		},
		paper: {
			name: "paper",
			desc: "学术风 · 极简 · 墨色+白",
			palette: {
				primary: {
					fg: "oklch(0.38 0.03 60)",
					bg: "oklch(0.92 0.01 80)"
				},
				accent: {
					fg: "oklch(0.42 0.06 150)",
					bg: "oklch(0.90 0.02 150)"
				},
				danger: {
					fg: "oklch(0.35 0.06 20)",
					bg: "oklch(0.90 0.02 20)"
				},
				warning: {
					fg: "oklch(0.45 0.08 80)",
					bg: "oklch(0.92 0.02 80)"
				},
				info: {
					fg: "oklch(0.40 0.06 240)",
					bg: "oklch(0.90 0.02 240)"
				},
				dim: {
					fg: "oklch(0.45 0.01 80)",
					bg: "oklch(0.94 0.01 80)"
				},
				muted: {
					fg: "oklch(0.45 0.01 80)",
					bg: "oklch(0.94 0.01 80)"
				},
				success: {
					fg: "oklch(0.40 0.08 150)",
					bg: "oklch(0.90 0.03 150)"
				}
			}
		},
		vivid: {
			name: "vivid",
			desc: "高饱和 · 演示/演讲 · 亮色",
			palette: {
				primary: {
					fg: "oklch(0.62 0.22 68)",
					bg: "oklch(0.88 0.10 68)"
				},
				accent: {
					fg: "oklch(0.58 0.18 180)",
					bg: "oklch(0.86 0.08 180)"
				},
				danger: {
					fg: "oklch(0.55 0.22 22)",
					bg: "oklch(0.86 0.08 22)"
				},
				warning: {
					fg: "oklch(0.65 0.24 85)",
					bg: "oklch(0.90 0.10 85)"
				},
				info: {
					fg: "oklch(0.52 0.16 250)",
					bg: "oklch(0.86 0.06 250)"
				},
				dim: {
					fg: "oklch(0.52 0.03 80)",
					bg: "oklch(0.90 0.01 80)"
				},
				muted: {
					fg: "oklch(0.52 0.03 80)",
					bg: "oklch(0.90 0.01 80)"
				},
				success: {
					fg: "oklch(0.55 0.20 150)",
					bg: "oklch(0.86 0.08 150)"
				}
			}
		},
		soft: {
			name: "soft",
			desc: "低对比 · 柔和 · 灰绿基调",
			palette: {
				primary: {
					fg: "oklch(0.50 0.06 140)",
					bg: "oklch(0.90 0.02 140)"
				},
				accent: {
					fg: "oklch(0.48 0.05 200)",
					bg: "oklch(0.90 0.02 200)"
				},
				danger: {
					fg: "oklch(0.42 0.08 30)",
					bg: "oklch(0.88 0.02 30)"
				},
				warning: {
					fg: "oklch(0.50 0.08 90)",
					bg: "oklch(0.90 0.03 90)"
				},
				info: {
					fg: "oklch(0.45 0.05 240)",
					bg: "oklch(0.90 0.02 240)"
				},
				dim: {
					fg: "oklch(0.48 0.02 100)",
					bg: "oklch(0.92 0.01 100)"
				},
				muted: {
					fg: "oklch(0.48 0.02 100)",
					bg: "oklch(0.92 0.01 100)"
				},
				success: {
					fg: "oklch(0.48 0.10 150)",
					bg: "oklch(0.88 0.04 150)"
				}
			}
		}
	};
	function resolveTheme(name) {
		return themes[name] || themes.warm;
	}

//#endregion
//#region vis/types.ts
/** Construct a typed EntityId from a prefix and name. */
	function eid(prefix, id) {
		return `${prefix}:${id}`;
	}

//#endregion
//#region vis/transform.ts
	function rotate(angle, cx, cy) {
		return {
			type: "rotate",
			angle,
			cx,
			cy
		};
	}
	function scale(sx, sy = sx) {
		return {
			type: "scale",
			sx,
			sy
		};
	}
	function translate(dx, dy) {
		return {
			type: "translate",
			dx,
			dy
		};
	}
	function lerp(a, b, t) {
		return a + (b - a) * t;
	}
	/** Interpolate between two transform arrays (must be same structure) */
	function interpolate(a, b, t) {
		return a.map((tf, i) => {
			const bt = b[i] ?? tf;
			switch (tf.type) {
				case "rotate": return {
					...tf,
					angle: lerp(tf.angle, bt.angle, t)
				};
				case "scale": return {
					...tf,
					sx: lerp(tf.sx, bt.sx, t),
					sy: lerp(tf.sy, bt.sy, t)
				};
				case "translate": return {
					...tf,
					dx: lerp(tf.dx, bt.dx, t),
					dy: lerp(tf.dy, bt.dy, t)
				};
			}
		});
	}
	/** Apply transforms to line geometry (from→to) */
	function applyLine(from, to, tf) {
		let nf = [...from], nt = [...to];
		for (const t of tf) switch (t.type) {
			case "rotate": {
				const cos = Math.cos(t.angle * Math.PI / 180), sin = Math.sin(t.angle * Math.PI / 180);
				const rot = (px, py) => [t.cx + (px - t.cx) * cos - (py - t.cy) * sin, t.cy + (px - t.cx) * sin + (py - t.cy) * cos];
				nf = rot(nf[0], nf[1]);
				nt = rot(nt[0], nt[1]);
				break;
			}
			case "scale":
				nt = [nf[0] + (nt[0] - nf[0]) * t.sx, nf[1] + (nt[1] - nf[1]) * t.sy];
				break;
			case "translate":
				nf = [nf[0] + t.dx, nf[1] + t.dy];
				nt = [nt[0] + t.dx, nt[1] + t.dy];
				break;
		}
		return {
			from: nf,
			to: nt
		};
	}
	/** Apply transforms to polygon vertices */
	function applyVertices(vertices, tf) {
		let nv = vertices.map((v) => [...v]);
		for (const t of tf) switch (t.type) {
			case "rotate": {
				const cos = Math.cos(t.angle * Math.PI / 180), sin = Math.sin(t.angle * Math.PI / 180);
				nv = nv.map(([px, py]) => [t.cx + (px - t.cx) * cos - (py - t.cy) * sin, t.cy + (px - t.cx) * sin + (py - t.cy) * cos]);
				break;
			}
			case "scale": {
				const cx = nv.reduce((s, v) => s + v[0], 0) / nv.length, cy = nv.reduce((s, v) => s + v[1], 0) / nv.length;
				nv = nv.map(([px, py]) => [cx + (px - cx) * t.sx, cy + (py - cy) * t.sy]);
				break;
			}
			case "translate":
				nv = nv.map(([px, py]) => [px + t.dx, py + t.dy]);
				break;
		}
		return nv;
	}

//#endregion
//#region vis/mixins.ts
	function resolveColor(p, c) {
		if (!c) return {
			stroke: p.primary.fg,
			fill: p.primary.bg
		};
		const col = p[c];
		if (col) return {
			stroke: col.fg,
			fill: col.bg
		};
		return {
			stroke: c,
			fill: c
		};
	}
	function patch$1(eid, fm, props) {
		fm.patch(eid, props);
	}
	const mixColor = (eid, fm, p) => ({ color(c) {
		const r = resolveColor(p, c);
		patch$1(eid, fm, {
			stroke: r.stroke,
			fill: r.fill
		});
		return this;
	} });
	const mixStroke = (eid, fm, p) => ({ color(c) {
		patch$1(eid, fm, { stroke: resolveColor(p, c).stroke });
		return this;
	} });
	const mixStrokeW = (eid, fm) => ({ strokeW(n) {
		patch$1(eid, fm, { strokeW: n });
		return this;
	} });
	const mixFill = (eid, fm, p) => ({ fill(c) {
		patch$1(eid, fm, { fill: resolveColor(p, c).fill });
		return this;
	} });
	const mixOpacity = (eid, fm) => ({ opacity(v) {
		patch$1(eid, fm, { opacity: v });
		return this;
	} });
	const mixSize = (eid, fm) => ({ size(n) {
		patch$1(eid, fm, {
			r: n,
			pathSize: n
		});
		return this;
	} });
	const mixDashed = (eid, fm) => ({ dashed(d = "5 4") {
		patch$1(eid, fm, { dash: d });
		return this;
	} });
	const mixLabel = (eid, fm) => ({ label(t) {
		patch$1(eid, fm, { label: t });
		return this;
	} });
	const mixLabelPos = (eid, fm, defaults) => ({ label(t, place, gap) {
		patch$1(eid, fm, {
			label: t,
			labelPlace: place ?? defaults.labelPlace,
			labelGap: gap ?? defaults.labelGap
		});
		return this;
	} });
	const mixNodeLabel = (eid, fm) => ({ label(t, place, gap) {
		const p = { label: t };
		if (place !== void 0) p.labelPlace = place;
		if (gap !== void 0) p.labelGap = gap;
		fm.patch(eid, p);
		return this;
	} });
	const mixMoveTo = (eid, fm) => ({ moveTo(x, y) {
		patch$1(eid, fm, {
			x,
			y
		});
		return this;
	} });
	function coreNodeMixin(eid, fm, p) {
		return {
			...mixColor(eid, fm, p),
			...mixStrokeW(eid, fm),
			...mixFill(eid, fm, p),
			...mixOpacity(eid, fm),
			...mixSize(eid, fm),
			...mixNodeLabel(eid, fm),
			...mixMoveTo(eid, fm)
		};
	}
	const mixTransform = (eid, fm, getKey) => ({
		rotate(a, cx, cy) {
			const e = fm.entities.get(eid);
			if (!e) return this;
			const d = e.desired;
			if (!d._base) _stashBase(d, getKey);
			d._tf = [...d._tf || [], rotate(a, cx, cy)];
			fm.patch(eid, {
				_tf: d._tf,
				_base: d._base
			});
			return this;
		},
		scale(sx, sy = sx) {
			const e = fm.entities.get(eid);
			if (!e) return this;
			const d = e.desired;
			if (!d._base) _stashBase(d, getKey);
			d._tf = [...d._tf || [], scale(sx, sy)];
			fm.patch(eid, {
				_tf: d._tf,
				_base: d._base
			});
			return this;
		},
		translate(dx, dy) {
			const e = fm.entities.get(eid);
			if (!e) return this;
			const d = e.desired;
			if (!d._base) _stashBase(d, getKey);
			d._tf = [...d._tf || [], translate(dx, dy)];
			fm.patch(eid, {
				_tf: d._tf,
				_base: d._base
			});
			return this;
		}
	});
	function _stashBase(d, getKey) {
		if (getKey === "vector" && "from" in d) d._base = {
			from: [...d.from || [0, 0]],
			to: [...d.to || [0, 0]]
		};
		else if (getKey === "polygon" && "vertices" in d) d._base = { vertices: (d.vertices || []).map((v) => [...v]) };
	}
	const mixTranslatePos = (eid, fm) => ({ translate(dx, dy) {
		const e = fm.entities.get(eid);
		if (!e) return this;
		const d = e.desired;
		if ("x" in d && d.x != null) patch$1(eid, fm, {
			x: d.x + dx,
			y: (d.y ?? 0) + dy
		});
		else if ("cx" in d && d.cx != null) patch$1(eid, fm, {
			cx: d.cx + dx,
			cy: (d.cy ?? 0) + dy
		});
		return this;
	} });

//#endregion
//#region vis/math.ts
	const vecLen = (dx, dy) => Math.sqrt(dx * dx + dy * dy);
	function createMathRenderer(fm, ctx, palette) {
		const p = palette;
		function point(id, pos, opts = {}) {
			const eid$9 = eid("point", id);
			const { stroke, fill } = resolveColor(p, opts.color);
			const r = opts.size ?? 4;
			const label = opts.label ?? "";
			fm.declare(eid$9, {
				type: "node",
				shape: "circle",
				x: pos[0],
				y: pos[1],
				r,
				stroke,
				fill,
				label,
				labelPlace: opts.labelPlace,
				labelGap: opts.labelGap
			});
			return {
				pos() {
					return [pos[0], pos[1]];
				},
				...mixColor(eid$9, fm, p),
				...mixLabelPos(eid$9, fm, {
					labelPlace: opts.labelPlace,
					labelGap: opts.labelGap
				}),
				...mixSize(eid$9, fm),
				...mixFill(eid$9, fm, p),
				...mixOpacity(eid$9, fm),
				...mixTranslatePos(eid$9, fm)
			};
		}
		function vector(id, from, to, opts = {}) {
			const eid$10 = eid("vector", id);
			const { stroke } = resolveColor(p, opts.color);
			const strokeW = opts.strokeW ?? 1.6;
			const dash = opts.dash ?? "";
			const label = opts.label ?? "";
			const labelGap = opts.labelGap ?? 10;
			const labelPlace = opts.labelPlace ?? "above";
			const marker = opts.marker ?? null;
			const a = offsetLine(from, to, 4, 4 + markerHalf(marker ?? void 0), true);
			fm.declare(eid$10, {
				type: "line",
				marker: "arrow",
				from: [a.x1, a.y1],
				to: [a.x2, a.y2],
				stroke,
				strokeW,
				dash,
				label,
				labelPlace,
				labelGap,
				_markerCfg: marker
			});
			return {
				...mixStroke(eid$10, fm, p),
				...mixLabelPos(eid$10, fm, {
					labelPlace,
					labelGap
				}),
				...mixStrokeW(eid$10, fm),
				...mixDashed(eid$10, fm),
				...mixOpacity(eid$10, fm),
				...mixTransform(eid$10, fm, "vector")
			};
		}
		function segment(id, a, b, opts = {}) {
			const eid$11 = eid("segment", id);
			const { stroke } = resolveColor(p, opts.color);
			const strokeW = opts.strokeW ?? 1.5;
			const dash = opts.dash ?? "";
			const label = opts.label ?? "";
			const labelGap = opts.labelGap ?? 10;
			fm.declare(eid$11, {
				type: "line",
				a,
				b,
				stroke,
				strokeW,
				dash,
				label,
				labelGap
			});
			return {
				...mixStroke(eid$11, fm, p),
				...mixStrokeW(eid$11, fm),
				...mixDashed(eid$11, fm),
				...mixLabel(eid$11, fm),
				...mixOpacity(eid$11, fm)
			};
		}
		function circle(id, center, radius, opts = {}) {
			const eid$12 = eid("circle", id);
			const { stroke, fill } = resolveColor(p, opts.color);
			const strokeW = opts.strokeW ?? 1.2;
			const dash = opts.dash ?? "";
			const opacity = opts.opacity ?? 1;
			const finalFill = opts.fill ?? p.accent.a(8);
			fm.declare(eid$12, {
				type: "region",
				shape: "circle",
				cx: center[0],
				cy: center[1],
				r: radius,
				stroke,
				fill: finalFill,
				strokeW,
				dash,
				opacity
			});
			return {
				...mixColor(eid$12, fm, p),
				...mixStrokeW(eid$12, fm),
				...mixFill(eid$12, fm, p),
				...mixDashed(eid$12, fm),
				...mixOpacity(eid$12, fm),
				...mixTranslatePos(eid$12, fm)
			};
		}
		function polygon(id, vertices, opts = {}) {
			const eid$13 = eid("polygon", id);
			const r = resolveColor(p, opts.color);
			const strokeW = opts.strokeW ?? 1.5;
			const opacity = opts.opacity ?? 1;
			const finalFill = opts.fill ?? r.fill;
			fm.declare(eid$13, {
				type: "region",
				shape: "polygon",
				vertices,
				stroke: r.stroke,
				fill: finalFill,
				strokeW,
				opacity
			});
			return {
				...mixColor(eid$13, fm, p),
				...mixStrokeW(eid$13, fm),
				...mixFill(eid$13, fm, p),
				...mixDashed(eid$13, fm),
				...mixOpacity(eid$13, fm),
				...mixTransform(eid$13, fm, "polygon")
			};
		}
		function rightAngle(id, vertex, ray1, ray2, opts = {}) {
			const eid$14 = eid("angle", id);
			const { stroke } = resolveColor(p, opts.color ?? "dim");
			const sz = opts.size ?? 8;
			const [vx, vy] = vertex;
			const d1 = vecLen(ray1[0] - vx, ray1[1] - vy) || 1;
			const d2 = vecLen(ray2[0] - vx, ray2[1] - vy) || 1;
			const u1x = (ray1[0] - vx) / d1, u1y = (ray1[1] - vy) / d1;
			const u2x = (ray2[0] - vx) / d2, u2y = (ray2[1] - vy) / d2;
			const ptsStr = [
				[vx + u1x * sz, vy + u1y * sz],
				[vx + (u1x + u2x) * sz, vy + (u1y + u2y) * sz],
				[vx + u2x * sz, vy + u2y * sz]
			].map((p) => p.join(",")).join(" ");
			fm.declare(eid$14, {
				type: "region",
				shape: "polygon",
				d: `M${ptsStr}`,
				x: 0,
				y: 0,
				stroke,
				fill: "none",
				strokeW: 1.5
			});
			return {
				...mixStroke(eid$14, fm, p),
				...mixStrokeW(eid$14, fm),
				...mixSize(eid$14, fm),
				...mixOpacity(eid$14, fm)
			};
		}
		function angle(id, vertex, ray1, ray2, opts = {}) {
			const eid$15 = eid("angle", id);
			const { stroke, fill } = resolveColor(p, opts.color);
			const label = opts.label ?? "";
			const arcR = opts.size ?? 30;
			const finalFill = opts.fill ?? p.warning.a(15);
			fm.declare(eid$15, {
				type: "group",
				subtype: "angle",
				vertex,
				ray1,
				ray2,
				stroke,
				fill: finalFill,
				label,
				arcR
			});
			return {
				...mixColor(eid$15, fm, p),
				...mixStrokeW(eid$15, fm),
				...mixFill(eid$15, fm, p),
				...mixDashed(eid$15, fm),
				...mixOpacity(eid$15, fm),
				...mixLabel(eid$15, fm)
			};
		}
		function fn(id, f, opts = {}) {
			const eid$16 = eid("fn", id);
			const { stroke } = resolveColor(p, opts.color);
			const strokeW = opts.strokeW ?? 1.5;
			const dash = opts.dash ?? "";
			const opacity = opts.opacity ?? 1;
			const label = opts.label ?? "";
			const domain = opts.domain ?? [0, 10];
			const samples = opts.samples ?? 200;
			const ox = opts.x ?? 0;
			const oy = opts.y ?? 300;
			const pw = opts.width ?? 780;
			const ph = opts.height ?? 460;
			fm.declare(eid$16, {
				type: "curve",
				f: f.toString(),
				domain,
				range: opts.range,
				x: ox,
				y: oy,
				width: pw,
				height: ph,
				samples,
				stroke,
				strokeW,
				dash,
				opacity,
				label
			});
			return {
				...mixStroke(eid$16, fm, p),
				...mixStrokeW(eid$16, fm),
				...mixDashed(eid$16, fm),
				...mixOpacity(eid$16, fm),
				...mixLabel(eid$16, fm)
			};
		}
		function grid(id, origin, opts = {}) {
			const eid$17 = eid("grid", id);
			const { stroke } = resolveColor(p, opts.color);
			fm.declare(eid$17, {
				type: "group",
				subtype: "grid",
				ox: origin[0],
				oy: origin[1],
				w: opts.width ?? 400,
				h: opts.height ?? 300,
				sp: opts.spacing ?? 40,
				stroke,
				strokeW: opts.strokeW ?? .3
			});
		}
		function axes(id, origin, opts = {}) {
			const eid$18 = eid("axes", id);
			const { stroke } = resolveColor(p, opts.color);
			fm.declare(eid$18, {
				type: "group",
				subtype: "axes",
				ox: origin[0],
				oy: origin[1],
				xl: opts.xLen ?? 300,
				yl: opts.yLen ?? 200,
				xLabel: opts.xLabel,
				yLabel: opts.yLabel,
				stroke,
				strokeW: opts.strokeW ?? 1.4
			});
		}
		function rect(id, cx, cy, w, h) {
			const hw = w / 2, hh = h / 2;
			return polygon(id, [
				[cx - hw, cy - hh],
				[cx + hw, cy - hh],
				[cx + hw, cy + hh],
				[cx - hw, cy + hh]
			]);
		}
		function ngon(id, cx, cy, r, sides) {
			const verts = [];
			for (let i = 0; i < sides; i++) {
				const a = 2 * Math.PI * i / sides - Math.PI / 2;
				verts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
			}
			return polygon(id, verts);
		}
		function ellipse(id, cx, cy, rx, ry, n = 32) {
			const verts = [];
			for (let i = 0; i < n; i++) {
				const a = 2 * Math.PI * i / n;
				verts.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]);
			}
			return polygon(id, verts);
		}
		function symbol(id, pos, opts = {}) {
			const eid$19 = eid("path", id);
			const t = {
				circle: circle_default,
				cross: cross_default,
				diamond: diamond_default,
				square: square_default,
				star: star_default,
				triangle: triangle_default,
				wye: wye_default
			}[opts.type ?? "circle"] ?? circle_default;
			const sy = Symbol$1().type(t).size((opts.size ?? 8) ** 2)();
			const d = sy ? `${sy}` : "";
			const r = resolveColor(p, opts.color);
			const rf = opts.fill ? resolveColor(p, opts.fill).fill : r.fill;
			fm.declare(eid$19, {
				type: "region",
				shape: "polygon",
				d,
				x: pos[0],
				y: pos[1],
				stroke: r.stroke,
				fill: rf,
				strokeW: 1.2
			});
			return {
				...mixStroke(eid$19, fm, p),
				...mixStrokeW(eid$19, fm),
				...mixDashed(eid$19, fm),
				...mixSize(eid$19, fm),
				...mixFill(eid$19, fm, p),
				...mixOpacity(eid$19, fm),
				...mixTranslatePos(eid$19, fm)
			};
		}
		function arc(id, center, opts) {
			const eid$20 = eid("path", id);
			const a = arc_default()({
				innerRadius: opts.innerR ?? 0,
				outerRadius: opts.outerR,
				startAngle: opts.startAngle,
				endAngle: opts.endAngle
			}) || "";
			const r = resolveColor(p, opts.color);
			const rf = opts.fill ? resolveColor(p, opts.fill).fill : r.fill;
			fm.declare(eid$20, {
				type: "region",
				shape: "polygon",
				d: `${a}`,
				x: center[0],
				y: center[1],
				stroke: r.stroke,
				fill: rf,
				strokeW: opts.strokeW ?? 1.2
			});
			return {
				...mixStroke(eid$20, fm, p),
				...mixStrokeW(eid$20, fm),
				...mixDashed(eid$20, fm),
				...mixSize(eid$20, fm),
				...mixFill(eid$20, fm, p),
				...mixOpacity(eid$20, fm),
				...mixTranslatePos(eid$20, fm)
			};
		}
		function projection(id, pt, lf, lt, opts = {}) {
			const eidSeg = eid("segment", id);
			const eidPt = eid("point", id + "-p");
			const { stroke } = resolveColor(p, opts.color);
			const dash = opts.dash ?? "4 3";
			const pc = opts.pointColor ?? stroke;
			const [px, py] = pt, [x1, y1] = lf, [x2, y2] = lt;
			const dx = x2 - x1, dy = y2 - y1;
			const t = dx === 0 && dy === 0 ? 0 : ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy);
			const fx = x1 + t * dx, fy = y1 + t * dy;
			fm.declare(eidSeg, {
				type: "line",
				a: pt,
				b: [fx, fy],
				stroke,
				strokeW: 1.2,
				dash,
				label: "",
				labelGap: 0
			});
			fm.declare(eidPt, {
				type: "node",
				shape: "circle",
				x: fx,
				y: fy,
				r: 3,
				stroke: pc,
				fill: pc,
				label: "",
				labelPlace: void 0,
				labelGap: void 0
			});
			return {
				...mixStroke(eidSeg, fm, p),
				...mixDashed(eidSeg, fm),
				...mixStrokeW(eidSeg, fm)
			};
		}
		function fill(id, pts, opts = {}) {
			const eid$21 = eid("fill", id);
			const r = resolveColor(p, opts.color);
			fm.declare(eid$21, {
				type: "region",
				shape: "fill",
				pts,
				fill: r.fill,
				opacity: opts.opacity
			});
			return {
				...mixFill(eid$21, fm, p),
				...mixOpacity(eid$21, fm)
			};
		}
		function fillFn(id, f, opts = {}) {
			const eid$22 = eid("fill", id);
			const domain = opts.domain ?? [0, 10];
			const samples = opts.samples ?? 200;
			const ox = opts.x ?? 0, oy = opts.y ?? 300;
			const pw = opts.width ?? 780, ph = opts.height ?? 460;
			const r = resolveColor(p, opts.color);
			const baseline = opts.baseline ?? 0;
			const [d0, d1] = domain;
			const step = (d1 - d0) / (samples - 1);
			let yMin = Infinity, yMax = -Infinity;
			for (let i = 0; i < samples; i++) {
				const y = f(d0 + i * step);
				if (y < yMin) yMin = y;
				if (y > yMax) yMax = y;
			}
			let r0 = yMin, r1 = yMax;
			if (opts.range) [r0, r1] = opts.range;
			if (r0 === r1) {
				r0 -= 1;
				r1 += 1;
			}
			const sx = (x) => ox + (x - d0) / (d1 - d0) * pw;
			const sy = (y) => oy - (y - r0) / (r1 - r0) * ph;
			const pts = [];
			pts.push([sx(d0), sy(baseline)]);
			for (let i = 0; i < samples; i++) pts.push([sx(d0 + i * step), sy(f(d0 + i * step))]);
			pts.push([sx(d1), sy(baseline)]);
			fm.declare(eid$22, {
				type: "region",
				shape: "fill",
				pts,
				fill: r.fill,
				opacity: opts.opacity ?? .45
			});
			return {
				...mixFill(eid$22, fm, p),
				...mixOpacity(eid$22, fm)
			};
		}
		function coords(id, origin, opts = {}) {
			const ox = origin[0], oy = origin[1];
			const xLen = opts.xLen ?? 300, yLen = opts.yLen ?? 200;
			const xd = opts.xDomain ?? [0, 10], yd = opts.yDomain ?? [-5, 5];
			const sx = (x) => ox + (x - xd[0]) / (xd[1] - xd[0]) * xLen;
			const sy = (y) => oy - (y - yd[0]) / (yd[1] - yd[0]) * yLen;
			return {
				axes(aOpts = {}) {
					axes(id + "-ax", origin, {
						xLen,
						yLen,
						xLabel: opts.xLabel,
						yLabel: opts.yLabel,
						color: aOpts.color,
						strokeW: aOpts.strokeW
					});
				},
				grid(gOpts = {}) {
					grid(id + "-g", [ox, oy - yLen], {
						width: xLen,
						height: yLen,
						spacing: gOpts.spacing ?? 40,
						color: gOpts.color
					});
				},
				fn(fid, f, fOpts = {}) {
					return fn(fid, f, {
						domain: fOpts.domain ?? xd,
						range: fOpts.range,
						x: ox,
						y: oy,
						width: xLen,
						height: yLen,
						color: fOpts.color,
						label: fOpts.label,
						samples: fOpts.samples,
						strokeW: fOpts.strokeW,
						dash: fOpts.dash,
						opacity: fOpts.opacity
					});
				},
				fillFn(fid, f, fOpts = {}) {
					return fillFn(fid, f, {
						domain: xd,
						x: ox,
						y: oy,
						width: xLen,
						height: yLen,
						color: fOpts.color,
						opacity: fOpts.opacity,
						baseline: fOpts.baseline
					});
				},
				point(pid, x, y, pOpts = {}) {
					return point(pid, [sx(x), sy(y)], pOpts);
				}
			};
		}
		return {
			point,
			vector,
			segment,
			circle,
			polygon,
			angle,
			rightAngle,
			projection,
			fill,
			fillFn,
			coords,
			fn,
			grid,
			axes,
			rect,
			ngon,
			ellipse,
			symbol,
			arc
		};
	}

//#endregion
//#region vis/graph.ts
	function createGraph(fm, ctx, palette) {
		const p = palette;
		function resolveColor(c) {
			const col = p[c];
			if (col) return {
				stroke: col.fg,
				fill: col.bg
			};
			return {
				stroke: c,
				fill: c
			};
		}
		const _vertices = /* @__PURE__ */ new Map();
		function vertex(id, pos) {
			const eid$7 = eid("vertex", id);
			const r = 10;
			const stroke = p.primary.fg;
			const fill = p.primary.a(15);
			fm.declare(eid$7, {
				type: "node",
				x: pos[0],
				y: pos[1],
				r,
				stroke,
				fill,
				label: id
			});
			const v = {
				id,
				x: pos[0],
				y: pos[1],
				_r: r,
				_stroke: stroke,
				_fill: fill,
				pos() {
					return [this.x, this.y];
				},
				color(c) {
					const resolved = resolveColor(c);
					this._stroke = resolved.stroke;
					this._fill = resolved.fill;
					fm.patch(eid$7, {
						stroke: this._stroke,
						fill: this._fill
					});
					return this;
				},
				label(t) {
					fm.patch(eid$7, { label: t });
					return this;
				},
				size(r) {
					this._r = r;
					fm.patch(eid$7, { r });
					return this;
				},
				fill(c) {
					this._fill = c;
					fm.patch(eid$7, { fill: c });
					return this;
				}
			};
			_vertices.set(id, v);
			return v;
		}
		function edge(a, b, opts) {
			const eid$8 = eid("edge", a.id + ":" + b.id);
			const stroke = p.dim.fg;
			const strokeW = 1.8;
			const directed = opts?.directed !== false;
			const gap = opts?.gap ?? 4;
			const marker = opts?.marker;
			const { x1, y1, x2, y2 } = offsetLine([a.x, a.y], [b.x, b.y], a._r + gap, b._r + markerHalf(marker), directed);
			fm.declare(eid$8, {
				type: "line",
				from: a.id,
				to: b.id,
				x1,
				y1,
				x2,
				y2,
				stroke,
				strokeW,
				dash: "",
				directed,
				marker: marker ?? null
			});
			return {
				color(c) {
					const resolved = resolveColor(c);
					fm.patch(eid$8, { stroke: resolved.stroke });
					return this;
				},
				strokeW(n) {
					fm.patch(eid$8, { strokeW: n });
					return this;
				},
				dashed(d = "5 4") {
					fm.patch(eid$8, { dash: d });
					return this;
				},
				label(t) {
					return this;
				},
				weight(n) {
					return this;
				}
			};
		}
		function layout(type, vertices, edges, opts) {
			const n = vertices.length;
			if (n === 0) return;
			const cx = opts?.center?.[0] ?? ctx.W / 2;
			const cy = opts?.center?.[1] ?? ctx.H / 2;
			switch (type) {
				case "circular": {
					const r = opts?.radius ?? Math.min(ctx.W, ctx.H) * .35;
					vertices.forEach((v, i) => {
						const angle = 2 * Math.PI * i / n - Math.PI / 2;
						v.x = cx + r * Math.cos(angle);
						v.y = cy + r * Math.sin(angle);
					});
					break;
				}
				case "force": {
					const sim = simulation_default(vertices).force("charge", manyBody_default().strength(-300)).force("center", center_default(cx, cy)).force("collision", collide_default().radius((d) => d._r + 2));
					if (edges && edges.length > 0) {
						const links = edges.map((e) => ({
							source: e.from,
							target: e.to
						}));
						sim.force("link", link_default(links).id((d) => d.id).distance(60));
					}
					sim.stop();
					for (let i = 0; i < 300; i++) sim.tick();
					break;
				}
			}
			for (const v of vertices) fm.declare(eid("vertex", v.id), {
				type: "node",
				x: v.x,
				y: v.y,
				r: v._r,
				stroke: v._stroke,
				fill: v._fill,
				label: v.label
			});
		}
		return {
			vertex,
			edge,
			layout
		};
	}

//#endregion
//#region vis/layout.ts
	function patch(eid, fm, props) {
		fm.patch(eid, props);
	}
	/** Compute absolute port position from owner node position + port placement */
	function portPos(ownerId, pos, fm) {
		const e = fm.entities.get(`vertex:${ownerId}`);
		if (!e) return [0, 0];
		const d = e.desired;
		const cx = d.x ?? 0, cy = d.y ?? 0;
		const bw = d._blockW ?? (d.r ?? 10) * 2;
		const bh = d._blockH ?? (d.r ?? 10) * 2;
		const hw = bw / 2, hh = bh / 2;
		if (Array.isArray(pos)) return [cx + pos[0], cy + pos[1]];
		switch (pos) {
			case "top": return [cx, cy - hh];
			case "bottom": return [cx, cy + hh];
			case "left": return [cx - hw, cy];
			case "right": return [cx + hw, cy];
		}
	}
	function createLayout(fm, p) {
		function port(id, ownerId, pos, opts = {}) {
			const eid$1 = eid("port", id);
			const r = resolveColor(p, opts.stroke);
			const [px, py] = portPos(ownerId, pos, fm);
			fm.declare(eid$1, {
				type: "node",
				shape: "circle",
				x: px,
				y: py,
				r: opts.size ?? 4,
				stroke: r.stroke,
				fill: opts.fill ?? r.fill,
				label: opts.label ?? "",
				_owner: eid("vertex", ownerId),
				_portPos: pos
			});
			return {
				...coreNodeMixin(eid$1, fm, p),
				pos() {
					const e = fm.entities.get(eid$1);
					if (!e) return [0, 0];
					const d = e.desired;
					return [d.x ?? 0, d.y ?? 0];
				}
			};
		}
		function node(id, x, y, opts = {}) {
			const eid$2 = eid("vertex", id);
			const r = resolveColor(p, opts.stroke ?? "primary");
			const isCircle = opts.shape === "circle";
			const sizeW = opts.w ?? 60, sizeH = opts.h ?? 36;
			opts.r;
			fm.declare(eid$2, {
				type: "node",
				shape: opts.shape ?? "rect",
				x,
				y,
				r: opts.rx ?? 5,
				fill: opts.fill ?? r.fill,
				stroke: r.stroke,
				strokeW: opts.strokeW ?? 1.5,
				opacity: opts.opacity ?? 1,
				label: opts.label ?? "",
				labelPlace: opts.labelPlace ?? "above",
				_blockW: isCircle ? void 0 : sizeW,
				_blockH: isCircle ? void 0 : sizeH,
				_shape: opts.shape ?? "rect"
			});
			return {
				...coreNodeMixin(eid$2, fm, p),
				size(w, h) {
					patch(eid$2, fm, {
						_blockW: w,
						_blockH: h ?? w
					});
					return this;
				},
				port(pid, pos, portOpts = {}) {
					return port(pid, id, pos, portOpts);
				}
			};
		}
		const BLOCK_STYLE = {
			muted: {
				stroke: "dim",
				strokeW: 1,
				fill: "dim"
			},
			normal: {
				stroke: "primary",
				strokeW: 1.5,
				fill: "primary"
			},
			active: {
				stroke: "primary",
				strokeW: 2,
				fill: "primary"
			}
		};
		function block(id, x, y, w, h, opts = {}) {
			const eid$3 = eid("vertex", id);
			const s = BLOCK_STYLE[opts.style ?? "normal"];
			const stroke = resolveColor(p, s.stroke).stroke;
			const fill = opts.fill ?? resolveColor(p, s.fill).fill;
			fm.declare(eid$3, {
				type: "node",
				shape: "rect",
				x: x + w / 2,
				y: y + h / 2,
				r: opts.rx ?? 8,
				fill,
				stroke,
				strokeW: opts.strokeW ?? s.strokeW,
				opacity: opts.opacity ?? 1,
				label: opts.label ?? "",
				labelPlace: opts.labelPlace ?? "above",
				_blockW: w,
				_blockH: h
			});
			return {
				...coreNodeMixin(eid$3, fm, p),
				size(nw, nh) {
					patch(eid$3, fm, {
						_blockW: nw,
						_blockH: nh ?? nw
					});
					return this;
				},
				port(pid, pos, portOpts = {}) {
					return port(pid, id, pos, portOpts);
				}
			};
		}
		function edge(id, fromPortId, toPortId, opts = {}) {
			const eid$4 = eid("edge", id);
			const r = resolveColor(p, opts.color ?? "dim");
			const fpe = fm.entities.get(`port:${fromPortId}`);
			const tpe = fm.entities.get(`port:${toPortId}`);
			const fx = (fpe?.desired)?.x ?? 0, fy = (fpe?.desired)?.y ?? 0;
			const tx = (tpe?.desired)?.x ?? 0, ty = (tpe?.desired)?.y ?? 0;
			const directed = opts.directed ?? false;
			const portR = (fpe?.desired)?.r ?? 4;
			const toR = (tpe?.desired)?.r ?? 4;
			const mt = directed ? markerTip() : 0;
			const { x1, y1, x2, y2 } = offsetLine([fx, fy], [tx, ty], portR, toR + mt + 2, directed);
			fm.declare(eid$4, {
				type: "line",
				x1,
				y1,
				x2,
				y2,
				stroke: r.stroke,
				strokeW: opts.strokeW ?? 1.5,
				dash: opts.dash ?? "",
				directed,
				_bend: opts.bend ?? false,
				_fromPort: fromPortId,
				_toPort: toPortId,
				label: opts.label ?? ""
			});
			return {
				color(c) {
					patch(eid$4, fm, { stroke: resolveColor(p, c).stroke });
					return this;
				},
				...mixStrokeW(eid$4, fm),
				...mixDashed(eid$4, fm),
				...mixOpacity(eid$4, fm),
				...mixLabel(eid$4, fm),
				directed(v) {
					patch(eid$4, fm, { directed: v });
					return this;
				},
				bend() {
					patch(eid$4, fm, { _bend: true });
					return this;
				}
			};
		}
		function layer(id, rank, opts = {}) {
			const eid$5 = eid("fill", id);
			const style = opts.style ?? "band";
			const r = resolveColor(p, opts.color ?? "accent");
			let y, h;
			if (opts.totalRanks != null) {
				const total = opts.totalRanks;
				const gap = opts.layerGap ?? 0;
				const startY = opts.startY ?? 48;
				const available = (opts.endY ?? 412) - startY;
				h = opts.h ?? (available - (total - 1) * gap) / total;
				y = opts.y ?? startY + rank * (h + gap);
			} else {
				y = opts.y ?? 0;
				h = opts.h ?? 60;
			}
			const x = opts.x ?? 0, w = opts.w ?? 780;
			const vertices = [
				[x, y],
				[x + w, y],
				[x + w, y + h],
				[x, y + h]
			];
			const rx = opts.rx ?? 8;
			const label = opts.label ?? "";
			const labelPlace = opts.labelPlace ?? "left";
			const labelGap = opts.labelGap ?? 6;
			if (style === "band") {
				const opacity = opts.opacity ?? .3;
				fm.declare(eid$5, {
					type: "region",
					shape: "polygon",
					vertices,
					stroke: "none",
					fill: r.fill,
					strokeW: 0,
					opacity,
					_rx: rx,
					label,
					labelPlace,
					labelGap
				});
				return {
					color(c) {
						patch(eid$5, fm, { fill: resolveColor(p, c).fill });
						return this;
					},
					...mixOpacity(eid$5, fm),
					...mixLabel(eid$5, fm),
					...mixDashed(eid$5, fm),
					...mixStrokeW(eid$5, fm)
				};
			}
			const dash = opts.dash ?? "4 3";
			const strokeW = opts.strokeW ?? 1.2;
			const opacity = opts.opacity ?? .7;
			const fill = r.fill + " / 0.05";
			fm.declare(eid$5, {
				type: "region",
				shape: "polygon",
				vertices,
				stroke: r.stroke,
				fill,
				strokeW,
				dash,
				opacity,
				_rx: rx,
				label,
				labelPlace,
				labelGap
			});
			return {
				color(c) {
					const rc = resolveColor(p, c);
					patch(eid$5, fm, {
						stroke: rc.stroke,
						fill: rc.fill + " / 0.05"
					});
					return this;
				},
				...mixOpacity(eid$5, fm),
				...mixLabel(eid$5, fm),
				...mixDashed(eid$5, fm),
				...mixStrokeW(eid$5, fm)
			};
		}
		function enclosure(id, x, y, w, h, opts = {}) {
			const eid$6 = eid("polygon", id);
			const r = resolveColor(p, opts.color ?? "dim");
			const rx = opts.rx ?? 8;
			const pts = [
				[x, y],
				[x + w, y],
				[x + w, y + h],
				[x, y + h]
			];
			fm.declare(eid$6, {
				type: "region",
				shape: "polygon",
				vertices: pts,
				stroke: r.stroke,
				fill: r.fill + " / 0.05",
				strokeW: opts.strokeW ?? 1.5,
				dash: opts.dash ?? "6 3",
				opacity: opts.opacity ?? 1,
				_rx: rx,
				label: opts.label ?? ""
			});
			return {
				color(c) {
					patch(eid$6, fm, { stroke: resolveColor(p, c).stroke });
					return this;
				},
				...mixDashed(eid$6, fm),
				...mixStrokeW(eid$6, fm),
				...mixOpacity(eid$6, fm),
				...mixLabel(eid$6, fm)
			};
		}
		return {
			node,
			block,
			port,
			edge,
			layer,
			enclosure
		};
	}

//#endregion
//#region vis/renderer/svg.ts
/** Construct identity-equivalent transforms matching the structure of the given list.
	*  Used to enable smooth attrTween interpolation when one side lacks _tf. */
	function identityTransforms(tf) {
		return tf.map((t) => {
			switch (t.type) {
				case "rotate": return {
					type: "rotate",
					angle: 0,
					cx: t.cx,
					cy: t.cy
				};
				case "scale": return {
					type: "scale",
					sx: 1,
					sy: 1
				};
				case "translate": return {
					type: "translate",
					dx: 0,
					dy: 0
				};
			}
		});
	}
	/** Pad both transform arrays to the same length with identity-equivalent transforms.
	*  Without this, interpolate() (which maps over the old array) would miss extra
	*  transforms in the new array — e.g. old=[rotate(45)], new=[rotate(45),scale(2)]
	*  would never interpolate the scale, causing the animation to appear frozen. */
	function normalizeTransforms(oldTf, newTf) {
		const maxLen = Math.max(oldTf.length, newTf.length);
		if (oldTf.length < maxLen) oldTf = [...oldTf, ...identityTransforms(newTf.slice(oldTf.length))];
		if (newTf.length < maxLen) newTf = [...newTf, ...identityTransforms(oldTf.slice(newTf.length))];
		return {
			old: oldTf,
			new: newTf
		};
	}
	function markerFor(stroke, cache, svg, config) {
		if (!stroke) return void 0;
		const size = config?.size ?? 10, w = config?.width ?? size, h = config?.height ?? size;
		const offset = config?.offset ?? 0, open = config?.open ?? false;
		const key = `${stroke}|${size}|${w}|${h}|${offset}|${open}`;
		if (!cache[key]) {
			let defs = svg.select("defs");
			if (defs.empty()) defs = svg.append("defs");
			const id = "fm" + Object.keys(cache).length;
			const vbW = w + offset + 2;
			const m = defs.append("marker").attr("id", id).attr("viewBox", `0 0 ${vbW} ${h}`).attr("refX", vbW / 2).attr("refY", h / 2).attr("markerWidth", vbW).attr("markerHeight", h).attr("markerUnits", "userSpaceOnUse").attr("orient", "auto");
			if (open) m.append("path").attr("d", `M2,0 L${vbW},${h / 2} L2,${h}`).attr("fill", svgColor("none")).attr("stroke", svgColor(stroke)).attr("stroke-width", 1.5);
			else m.append("path").attr("d", `M2,0 L${vbW},${h / 2} L2,${h} Z`).attr("fill", svgColor(stroke));
			cache[key] = id;
		}
		return `url(#${cache[key]})`;
	}
	function applyCommon(svg, opacity) {
		if (opacity != null) svg.attr("opacity", opacity);
	}
	function _angleArc(vx, vy, r1x, r1y, r2x, r2y, arcR) {
		let a1 = Math.atan2(r1y - vy, r1x - vx), a2 = Math.atan2(r2y - vy, r2x - vx);
		if (a1 < 0) a1 += 2 * Math.PI;
		if (a2 < 0) a2 += 2 * Math.PI;
		if (Math.abs(a2 - a1) < .001) a2 = a1 + .02;
		const cwLen = a2 >= a1 ? a2 - a1 : 2 * Math.PI - a1 + a2;
		const ccwLen = a2 < a1 ? a1 - a2 : a1 + (2 * Math.PI - a2);
		const sweep = cwLen <= ccwLen ? 1 : 0;
		const arcLen = sweep === 1 ? cwLen : ccwLen;
		const ma = sweep === 1 ? a1 + arcLen / 2 : a1 - arcLen / 2;
		const x1 = vx + arcR * Math.cos(a1), y1 = vy + arcR * Math.sin(a1);
		const x2 = vx + arcR * Math.cos(a2), y2 = vy + arcR * Math.sin(a2);
		return {
			a1,
			a2,
			sweep,
			ma,
			path: `M${x1},${y1} A${arcR},${arcR} 0 0,${sweep} ${x2},${y2}`
		};
	}
	function drawEntity(ctx, id, d, markerCache) {
		const { bg, nodes, edges, overlay } = ctx.stage;
		switch (d.type) {
			case "node": {
				const nd = d;
				const g = nodes.append("g").attr("data-id", id);
				if (nd.shape === "rect") {
					const bw = nd._blockW ?? nd.w ?? 60, bh = nd._blockH ?? nd.h ?? 36;
					g.append("rect").attr("class", "shp").attr("x", nd.x - bw / 2).attr("y", nd.y - bh / 2).attr("width", bw).attr("height", bh).attr("rx", nd.rx ?? 5).attr("fill", svgColor(nd.fill)).attr("stroke", svgColor(nd.stroke)).attr("stroke-width", nd.strokeW ?? 1.5);
				} else if (nd.shape === "symbol") {
					const sym = globalThis.d3?.symbol?.().type?.(globalThis.d3?.[nd.symType ?? "symbolCircle"] ?? globalThis.d3?.symbolCircle)?.size?.((nd.r ?? 8) ** 2)?.();
					g.append("path").attr("data-id", id).attr("d", sym ? `${sym}` : "").attr("transform", `translate(${nd.x},${nd.y})`).attr("fill", svgColor(nd.fill)).attr("stroke", svgColor(nd.stroke)).attr("stroke-width", nd.strokeW ?? 1.2);
				} else g.append("circle").attr("class", "shp").attr("cx", nd.x).attr("cy", nd.y).attr("r", nd.r ?? 4).attr("fill", svgColor(nd.fill)).attr("stroke", svgColor(nd.stroke)).attr("stroke-width", nd.strokeW ?? 1.5);
				applyCommon(g, nd.opacity);
				const label = nd.label || "";
				let text = null;
				if (label) {
					nd._blockW ?? nd.w ?? (nd.r ?? 10) * 2;
					const bh = nd._blockH ?? nd.h ?? (nd.r ?? 10) * 2;
					const gap = nd.labelGap ?? 12;
					const place = nd.labelPlace ?? "above";
					let ly, anchor = "middle";
					if (place === "above") ly = nd.y - bh / 2 - gap;
					else if (place === "below") ly = nd.y + bh / 2 + gap;
					else if (place === "left") {
						ly = nd.y;
						anchor = "end";
					} else if (place === "right") {
						ly = nd.y;
						anchor = "start";
					} else ly = nd.y - bh / 2 - gap;
					text = g.append("text").attr("class", "vlbl-txt").attr("font-size", "11px").attr("font-family", "JetBrains Mono,monospace").attr("fill", svgColor(nd.stroke)).attr("font-weight", "600").attr("x", nd.x).attr("y", ly).attr("text-anchor", anchor).text(label);
				}
				return {
					group: g,
					text
				};
			}
			case "line": {
				const ld = d;
				let x1, y1, x2, y2;
				if (ld._tf && ld._base) {
					const b = ld._base;
					const res = applyLine(b.from, b.to, ld._tf);
					x1 = res.from[0];
					y1 = res.from[1];
					x2 = res.to[0];
					y2 = res.to[1];
				} else {
					x1 = ld.x1 ?? ld.from?.[0] ?? ld.a?.[0] ?? 0;
					y1 = ld.y1 ?? ld.from?.[1] ?? ld.a?.[1] ?? 0;
					x2 = ld.x2 ?? ld.to?.[0] ?? ld.b?.[0] ?? 0;
					y2 = ld.y2 ?? ld.to?.[1] ?? ld.b?.[1] ?? 0;
				}
				const hasMarker = ld.marker === "arrow" || ld.directed;
				const line = edges.append("line").attr("data-id", id).attr("x1", x1).attr("y1", y1).attr("x2", x2).attr("y2", y2).attr("stroke", svgColor(ld.stroke)).attr("stroke-width", ld.strokeW).attr("stroke-dasharray", ld.dash ?? "").attr("stroke-linecap", "round").attr("marker-end", hasMarker ? markerFor(ld.stroke, markerCache, ctx.svg, ld._markerCfg ?? null) ?? null : null);
				applyCommon(line, ld.opacity);
				return {
					group: line,
					text: null
				};
			}
			case "region": {
				const rd = d;
				if (rd.shape === "circle") {
					const el = bg.append("circle").attr("data-id", id).attr("cx", rd.cx ?? 0).attr("cy", rd.cy ?? 0).attr("r", rd.r ?? 0).attr("fill", svgColor(rd.fill)).attr("stroke", svgColor(rd.stroke ?? rd.fill)).attr("stroke-width", rd.strokeW ?? 1.2);
					applyCommon(el, rd.opacity);
					return {
						group: el,
						text: null
					};
				}
				if (rd.shape === "arc") {
					const a = globalThis.d3?.arc?.()?.({
						innerRadius: rd.innerR ?? 0,
						outerRadius: rd.outerR ?? 0,
						startAngle: rd.startAngle ?? 0,
						endAngle: rd.endAngle ?? 0
					}) ?? "";
					const el = bg.append("path").attr("data-id", id).attr("d", `${a}`).attr("transform", `translate(${rd.cx ?? 0},${rd.cy ?? 0})`).attr("fill", svgColor(rd.fill)).attr("stroke", svgColor(rd.stroke ?? rd.fill)).attr("stroke-width", rd.strokeW ?? 1.2);
					applyCommon(el, rd.opacity);
					return {
						group: el,
						text: null
					};
				}
				let pts;
				if (rd._tf && rd._base && "vertices" in rd._base) pts = applyVertices(rd._base.vertices, rd._tf);
				else pts = rd.pts ?? rd.vertices ?? [];
				const ptsStr = pts.map((p) => p.join(",")).join(" ");
				const el = bg.append("polygon").attr("data-id", id).attr("points", ptsStr).attr("fill", svgColor(rd.fill)).attr("stroke", svgColor(rd.stroke ?? "none")).attr("stroke-width", rd.strokeW ?? 0).attr("stroke-dasharray", rd.dash ?? "");
				applyCommon(el, rd.opacity);
				let rt = null;
				const rlabel = rd.label ?? "";
				if (rlabel) {
					const minX = Math.min(...pts.map((p) => p[0]));
					const maxX = Math.max(...pts.map((p) => p[0]));
					const minY = Math.min(...pts.map((p) => p[1]));
					const maxY = Math.max(...pts.map((p) => p[1]));
					const cx = (minX + maxX) / 2;
					const cy = (minY + maxY) / 2;
					const gap = rd.labelGap ?? 6;
					let lx, ly, anchor;
					switch (rd.labelPlace) {
						case "above":
							lx = cx;
							ly = minY - gap;
							anchor = "middle";
							break;
						case "below":
							lx = cx;
							ly = maxY + gap;
							anchor = "middle";
							break;
						case "left":
							lx = minX + gap;
							ly = minY + 14;
							anchor = "start";
							break;
						case "right":
							lx = maxX + gap;
							ly = minY + 10;
							anchor = "start";
							break;
						default:
							lx = cx;
							ly = cy + 4;
							anchor = "middle";
							break;
					}
					rt = bg.append("text").attr("class", "vlbl-txt").attr("font-size", "10px").attr("font-family", "JetBrains Mono,monospace").attr("fill", "#888").attr("font-weight", "500").attr("x", lx).attr("y", ly).attr("text-anchor", anchor).text(rlabel);
				}
				return {
					group: el,
					text: rt
				};
			}
			case "curve": {
				const cd = d;
				const [d0, d1] = cd.domain, n = cd.samples ?? 200;
				const step = (d1 - d0) / (n - 1), ox = cd.x, oy = cd.y;
				const pw = cd.width, ph = cd.height;
				const fn = new Function("x", `return (${cd.f})(x)`);
				let yMin = Infinity, yMax = -Infinity;
				for (let i = 0; i < n; i++) {
					const y = fn(d0 + i * step);
					if (y < yMin) yMin = y;
					if (y > yMax) yMax = y;
				}
				let r0 = yMin, r1 = yMax;
				if (cd.range) [r0, r1] = cd.range;
				if (r0 === r1) {
					r0 -= 1;
					r1 += 1;
				}
				const sx = (x) => ox + (x - d0) / (d1 - d0) * pw;
				const sy = (y) => oy - (y - r0) / (r1 - r0) * ph;
				const ptsStr = Array.from({ length: n }, (_, i) => {
					const xv = d0 + i * step;
					return [sx(xv), sy(fn(xv))].join(",");
				}).join(" ");
				const el = edges.append("polyline").attr("data-id", id).attr("points", ptsStr).attr("fill", svgColor("none")).attr("stroke", svgColor(cd.stroke)).attr("stroke-width", cd.strokeW).attr("stroke-dasharray", cd.dash ?? "");
				applyCommon(el, cd.opacity);
				return {
					group: el,
					text: null
				};
			}
			case "group": {
				const gd = d;
				if (gd.subtype === "angle") {
					const gv = overlay.append("g").attr("data-id", id);
					const [vx, vy] = gd.vertex ?? [0, 0], [r1x, r1y] = gd.ray1 ?? [0, 0], [r2x, r2y] = gd.ray2 ?? [0, 0];
					const arc = _angleArc(vx, vy, r1x, r1y, r2x, r2y, gd.arcR ?? 30);
					gv.append("path").attr("d", arc.path).attr("fill", svgColor("none")).attr("stroke", svgColor(gd.stroke ?? "#000")).attr("stroke-width", gd.strokeW ?? 1.5);
					let text = null;
					const label = gd.label ?? "";
					if (label && Math.abs(arc.a2 - arc.a1) > .02) {
						const lr = (gd.arcR ?? 30) + 12;
						text = gv.append("text").attr("x", vx + lr * Math.cos(arc.ma)).attr("y", vy + lr * Math.sin(arc.ma)).attr("text-anchor", "middle").attr("dominant-baseline", "middle").attr("font-size", "10px").attr("font-family", "JetBrains Mono,monospace").attr("fill", svgColor(gd.stroke ?? "#000")).text(label);
					}
					applyCommon(gv, gd.opacity);
					return {
						group: gv,
						text
					};
				}
				const g = bg.append("g").attr("data-id", id);
				if (gd.subtype === "axes") {
					const ox = gd.ox ?? 0, oy = gd.oy ?? 0, xl = gd.xl ?? 300, yl = gd.yl ?? 200, sw = gd.strokeW ?? 1.4;
					g.append("line").attr("x1", ox).attr("y1", oy).attr("x2", ox + xl + 10).attr("y2", oy).attr("stroke", svgColor(gd.stroke)).attr("stroke-width", sw);
					g.append("polygon").attr("points", `${ox + xl + 10},${oy} ${ox + xl},${oy - 6} ${ox + xl},${oy + 6}`).attr("fill", svgColor(gd.stroke));
					g.append("line").attr("x1", ox).attr("y1", oy).attr("x2", ox).attr("y2", oy - yl - 10).attr("stroke", svgColor(gd.stroke)).attr("stroke-width", sw);
					g.append("polygon").attr("points", `${ox},${oy - yl - 10} ${ox - 6},${oy - yl} ${ox + 6},${oy - yl}`).attr("fill", svgColor(gd.stroke));
					g.append("circle").attr("cx", ox).attr("cy", oy).attr("r", 3).attr("fill", svgColor("#fff")).attr("stroke", svgColor(gd.stroke)).attr("stroke-width", sw);
				} else if (gd.subtype === "grid") {
					const ox = gd.ox ?? 0, oy = gd.oy ?? 0, w = gd.w ?? 400, h = gd.h ?? 300, sp = gd.sp ?? 40;
					for (let x = ox; x <= ox + w; x += sp) g.append("line").attr("x1", x).attr("y1", oy).attr("x2", x).attr("y2", oy + h).attr("stroke", svgColor(gd.stroke)).attr("stroke-width", gd.strokeW ?? .3);
					for (let y = oy; y <= oy + h; y += sp) g.append("line").attr("x1", ox).attr("y1", y).attr("x2", ox + w).attr("y2", y).attr("stroke", svgColor(gd.stroke)).attr("stroke-width", gd.strokeW ?? .3);
				}
				applyCommon(g, gd.opacity);
				return {
					group: g,
					text: null
				};
			}
		}
	}
	function transitionEntity(svg, text, oldState, newState, tr, markerCache, svgRoot) {
		switch (newState.type) {
			case "node": {
				const nd = newState;
				if (nd.shape === "rect") {
					const bw = nd._blockW ?? nd.w ?? 60, bh = nd._blockH ?? nd.h ?? 36;
					svg.select("rect").interrupt().transition(tr).attr("x", nd.x - bw / 2).attr("y", nd.y - bh / 2).attr("width", bw).attr("height", bh).attr("fill", svgColor(nd.fill)).attr("stroke", svgColor(nd.stroke)).attr("stroke-width", nd.strokeW ?? 1.5);
				} else svg.select(".shp").interrupt().transition(tr).attr("cx", nd.x).attr("cy", nd.y).attr("r", nd.r ?? 4).attr("fill", svgColor(nd.fill)).attr("stroke", svgColor(nd.stroke)).attr("stroke-width", nd.strokeW ?? 1.5);
				applyCommon(svg, nd.opacity);
				break;
			}
			case "line": {
				const ld = newState;
				const oldLd = oldState;
				let oldTf = oldLd._tf;
				let newTf = ld._tf;
				let lineBase;
				if (ld._tf && ld._base) {
					lineBase = ld._base;
					if (!oldLd._tf) oldTf = identityTransforms(ld._tf);
				}
				if (oldLd._tf && oldLd._base && !lineBase) {
					lineBase = oldLd._base;
					if (!ld._tf) newTf = identityTransforms(oldLd._tf);
				}
				if (lineBase && oldTf && newTf) {
					const norm = normalizeTransforms(oldTf, newTf);
					svg.interrupt().transition(tr).attrTween("x1", () => (t) => applyLine(lineBase.from, lineBase.to, interpolate(norm.old, norm.new, t)).from[0].toString()).attrTween("y1", () => (t) => applyLine(lineBase.from, lineBase.to, interpolate(norm.old, norm.new, t)).from[1].toString()).attrTween("x2", () => (t) => applyLine(lineBase.from, lineBase.to, interpolate(norm.old, norm.new, t)).to[0].toString()).attrTween("y2", () => (t) => applyLine(lineBase.from, lineBase.to, interpolate(norm.old, norm.new, t)).to[1].toString()).attr("stroke", svgColor(ld.stroke)).attr("stroke-width", ld.strokeW);
				} else {
					let x1, y1, x2, y2;
					if (ld._tf && ld._base) {
						const b = ld._base;
						const res = applyLine(b.from, b.to, ld._tf);
						x1 = res.from[0];
						y1 = res.from[1];
						x2 = res.to[0];
						y2 = res.to[1];
					} else {
						x1 = ld.x1 ?? ld.from?.[0] ?? ld.a?.[0] ?? 0;
						y1 = ld.y1 ?? ld.from?.[1] ?? ld.a?.[1] ?? 0;
						x2 = ld.x2 ?? ld.to?.[0] ?? ld.b?.[0] ?? 0;
						y2 = ld.y2 ?? ld.to?.[1] ?? ld.b?.[1] ?? 0;
					}
					svg.interrupt().transition(tr).attr("x1", x1).attr("y1", y1).attr("x2", x2).attr("y2", y2).attr("stroke", svgColor(ld.stroke)).attr("stroke-width", ld.strokeW);
				}
				if (ld.opacity != null) svg.transition(tr).attr("opacity", ld.opacity);
				break;
			}
			case "region": {
				const rd = newState;
				if (rd.shape === "circle") svg.interrupt().transition(tr).attr("cx", rd.cx ?? 0).attr("cy", rd.cy ?? 0).attr("r", rd.r ?? 0).attr("fill", svgColor(rd.fill)).attr("stroke", svgColor(rd.stroke ?? rd.fill));
				else {
					const oldRd = oldState;
					let oldTf = oldRd._tf;
					let newTf = rd._tf;
					let regionBase;
					if (rd._tf && rd._base && "vertices" in rd._base) {
						regionBase = rd._base.vertices;
						if (!oldRd._tf) oldTf = identityTransforms(rd._tf);
					}
					if (oldRd._tf && oldRd._base && "vertices" in oldRd._base && !regionBase) {
						regionBase = oldRd._base.vertices;
						if (!rd._tf) newTf = identityTransforms(oldRd._tf);
					}
					if (regionBase && oldTf && newTf) {
						const norm = normalizeTransforms(oldTf, newTf);
						svg.interrupt().transition(tr).attrTween("points", () => (t) => applyVertices(regionBase, interpolate(norm.old, norm.new, t)).map((p) => p.join(",")).join(" ")).attr("fill", svgColor(rd.fill)).attr("stroke", svgColor(rd.stroke ?? "none"));
					} else {
						let pts;
						if (rd._tf && rd._base && "vertices" in rd._base) pts = applyVertices(rd._base.vertices, rd._tf);
						else pts = rd.pts ?? rd.vertices ?? [];
						svg.interrupt().transition(tr).attr("points", pts.map((p) => p.join(",")).join(" ")).attr("fill", svgColor(rd.fill)).attr("stroke", svgColor(rd.stroke ?? "none"));
					}
				}
				if (rd.opacity != null) svg.transition(tr).attr("opacity", rd.opacity);
				break;
			}
			case "group": {
				const gd = newState;
				if (gd.subtype === "angle") {
					const [vx, vy] = gd.vertex ?? [0, 0], [r1x, r1y] = gd.ray1 ?? [0, 0], [r2x, r2y] = gd.ray2 ?? [0, 0];
					const arc = _angleArc(vx, vy, r1x, r1y, r2x, r2y, gd.arcR ?? 30);
					svg.select("path").interrupt().transition(tr).attr("d", arc.path).attr("stroke", svgColor(gd.stroke ?? "#000")).attr("stroke-width", gd.strokeW ?? 1.5);
					const label = gd.label ?? "";
					if (label && Math.abs(arc.a2 - arc.a1) > .02) {
						const lr = (gd.arcR ?? 30) + 12;
						if (text) text.interrupt().transition(tr).attr("x", vx + lr * Math.cos(arc.ma)).attr("y", vy + lr * Math.sin(arc.ma)).text(label);
						else {
							const existing = svg.select("text");
							if (!existing.empty()) existing.interrupt().transition(tr).attr("x", vx + lr * Math.cos(arc.ma)).attr("y", vy + lr * Math.sin(arc.ma)).text(label);
							else svg.append("text").attr("text-anchor", "middle").attr("dominant-baseline", "middle").attr("font-size", "10px").attr("font-family", "JetBrains Mono,monospace").attr("fill", svgColor(gd.stroke ?? "#000")).attr("x", vx + lr * Math.cos(arc.ma)).attr("y", vy + lr * Math.sin(arc.ma)).text(label);
						}
					} else if (text) text.text("");
					else svg.select("text").text("");
				}
				break;
			}
		}
	}
	function updateEntityImmediate(svg, text, d) {
		switch (d.type) {
			case "node": {
				const nd = d;
				if (nd.shape === "rect") {
					const bw = nd._blockW ?? nd.w ?? 60, bh = nd._blockH ?? nd.h ?? 36;
					svg.select("rect").attr("x", nd.x - bw / 2).attr("y", nd.y - bh / 2).attr("width", bw).attr("height", bh).attr("fill", svgColor(nd.fill)).attr("stroke", svgColor(nd.stroke)).attr("stroke-width", nd.strokeW ?? 1.5);
				} else svg.select(".shp").attr("cx", nd.x).attr("cy", nd.y).attr("r", nd.r ?? 4).attr("fill", svgColor(nd.fill)).attr("stroke", svgColor(nd.stroke)).attr("stroke-width", nd.strokeW ?? 1.5);
				applyCommon(svg, nd.opacity);
				break;
			}
			case "line": {
				const ld = d;
				let x1, y1, x2, y2;
				if (ld._tf && ld._base) {
					const b = ld._base;
					const res = applyLine(b.from, b.to, ld._tf);
					x1 = res.from[0];
					y1 = res.from[1];
					x2 = res.to[0];
					y2 = res.to[1];
				} else {
					x1 = ld.x1 ?? ld.from?.[0] ?? 0;
					y1 = ld.y1 ?? ld.from?.[1] ?? 0;
					x2 = ld.x2 ?? ld.to?.[0] ?? 0;
					y2 = ld.y2 ?? ld.to?.[1] ?? 0;
				}
				svg.attr("x1", x1).attr("y1", y1).attr("x2", x2).attr("y2", y2).attr("stroke", svgColor(ld.stroke)).attr("stroke-width", ld.strokeW);
				applyCommon(svg, ld.opacity);
				break;
			}
			case "region": {
				const rd = d;
				let pts;
				if (rd._tf && rd._base && "vertices" in rd._base) pts = applyVertices(rd._base.vertices, rd._tf);
				else pts = rd.pts ?? rd.vertices ?? [];
				svg.attr("points", pts.map((p) => p.join(",")).join(" ")).attr("fill", svgColor(rd.fill)).attr("stroke", svgColor(rd.stroke ?? "none")).attr("stroke-width", rd.strokeW ?? 0);
				applyCommon(svg, rd.opacity);
				break;
			}
			case "group": {
				const gd = d;
				if (gd.subtype === "angle") {
					const [vx, vy] = gd.vertex ?? [0, 0], [r1x, r1y] = gd.ray1 ?? [0, 0], [r2x, r2y] = gd.ray2 ?? [0, 0];
					const arc = _angleArc(vx, vy, r1x, r1y, r2x, r2y, gd.arcR ?? 30);
					svg.select("path").attr("d", arc.path).attr("stroke", svgColor(gd.stroke ?? "#000")).attr("stroke-width", gd.strokeW ?? 1.5);
					const label = gd.label ?? "";
					if (label && Math.abs(arc.a2 - arc.a1) > .02) {
						const lr = (gd.arcR ?? 30) + 12;
						if (text) text.attr("x", vx + lr * Math.cos(arc.ma)).attr("y", vy + lr * Math.sin(arc.ma)).text(label);
						else {
							const existing = svg.select("text");
							if (!existing.empty()) existing.attr("x", vx + lr * Math.cos(arc.ma)).attr("y", vy + lr * Math.sin(arc.ma)).text(label);
							else svg.append("text").attr("x", vx + lr * Math.cos(arc.ma)).attr("y", vy + lr * Math.sin(arc.ma)).attr("text-anchor", "middle").attr("dominant-baseline", "middle").attr("font-size", "10px").attr("font-family", "JetBrains Mono,monospace").attr("fill", svgColor(gd.stroke ?? "#000")).text(label);
						}
					} else if (text) text.text("");
					else svg.select("text").text("");
				}
				break;
			}
		}
	}
	var SVGRenderer = class {
		constructor(ctx) {
			this.handles = /* @__PURE__ */ new Map();
			this._markerCache = {};
			this.ctx = ctx;
		}
		beginFrame() {
			this.ctx.root.selectAll(".vlbl").remove();
		}
		commitFrame(_opts) {
			this._repositionLabels();
		}
		create(id, state) {
			const h = new SVGHandle(this.ctx, id, state, this._markerCache);
			this.handles.set(id, h);
			return h;
		}
		dispose() {
			this.handles.clear();
		}
		_repositionLabels() {
			const edgeAngles = /* @__PURE__ */ new Map();
			for (const [id, h] of this.handles) {
				if (h.state.type !== "line") continue;
				const ld = h.state;
				const x1 = ld.x1 ?? ld.from?.[0] ?? 0, y1 = ld.y1 ?? ld.from?.[1] ?? 0;
				const x2 = ld.x2 ?? ld.to?.[0] ?? 0, y2 = ld.y2 ?? ld.to?.[1] ?? 0;
				const dx = x2 - x1, dy = y2 - y1;
				const ang = Math.atan2(dy, dx);
				const rev = ang > 0 ? ang - Math.PI : ang + Math.PI;
				const from = ld._fromPort ?? "", to = ld._toPort ?? "";
				if (!edgeAngles.has(from)) edgeAngles.set(from, []);
				if (!edgeAngles.has(to)) edgeAngles.set(to, []);
				edgeAngles.get(from).push(ang);
				edgeAngles.get(to).push(rev);
			}
			const dirs = [
				{
					place: "above",
					angle: -Math.PI / 2,
					dx: 0,
					dy: -1,
					anchor: "middle",
					dyAttr: null
				},
				{
					place: "below",
					angle: Math.PI / 2,
					dx: 0,
					dy: 1,
					anchor: "middle",
					dyAttr: "0.6em"
				},
				{
					place: "right",
					angle: 0,
					dx: 1,
					dy: 0,
					anchor: "start",
					dyAttr: "0.35em"
				},
				{
					place: "left",
					angle: Math.PI,
					dx: -1,
					dy: 0,
					anchor: "end",
					dyAttr: "0.35em"
				}
			];
			function angleDiff(a, b) {
				let d = Math.abs(a - b);
				if (d > Math.PI) d = 2 * Math.PI - d;
				return d;
			}
			for (const [id, h] of this.handles) {
				if (h.state.type !== "node") continue;
				const nd = h.state;
				const label = nd.label || "";
				if (!label) continue;
				const angles = edgeAngles.get(label) ?? [];
				let place = dirs[0];
				for (const dir of dirs) if (angles.every((a) => angleDiff(a, dir.angle) >= Math.PI / 4)) {
					place = dir;
					break;
				}
				const bw = nd._blockW ?? nd.w ?? (nd.r ?? 10) * 2;
				const bh = nd._blockH ?? nd.h ?? (nd.r ?? 10) * 2;
				const halfW = bw / 2, halfH = bh / 2;
				const gap = 6;
				const tx = nd.x + place.dx * (halfW + gap);
				const ty = nd.y + place.dy * (halfH + gap);
				h.setTextPosition(tx, ty, place.anchor, place.dyAttr);
			}
		}
	};
	var SVGHandle = class {
		constructor(ctx, id, state, markerCache) {
			this.svg = null;
			this._text = null;
			this.ctx = ctx;
			this._cache = markerCache;
			this.state = { ...state };
			this._clean(id);
			const result = drawEntity(ctx, id, state, markerCache);
			this.svg = result.group;
			this._text = result.text;
		}
		update(state, opts) {
			if (!this.svg) {
				this.state = { ...state };
				return;
			}
			if (opts?.transition) transitionEntity(this.svg, this._text, this.state, state, opts.transition, this._cache, this.ctx.svg);
			else updateEntityImmediate(this.svg, this._text, state);
			this.state = { ...state };
		}
		setTextPosition(x, y, anchor, dyAttr) {
			if (!this._text) return;
			this._text.attr("x", x).attr("y", y).attr("text-anchor", anchor);
			if (dyAttr) this._text.attr("dy", dyAttr);
			else this._text.attr("dy", null);
		}
		remove() {
			this.svg?.remove();
			this._text?.remove();
			this.svg = null;
			this._text = null;
		}
		_clean(id) {
			[
				this.ctx.stage.bg,
				this.ctx.stage.nodes,
				this.ctx.stage.edges,
				this.ctx.stage.overlay
			].forEach((g) => g.selectAll("[data-id]").filter(function() {
				const did = this.getAttribute("data-id");
				return did === id || did.startsWith(id + "-");
			}).remove());
		}
	};

//#endregion
//#region vis/frame.ts
	const defaultAnimation = {
		duration: 500,
		enter: {
			ratio: .6,
			easing: cubicOut
		},
		update: {
			ratio: 1,
			easing: cubicOut
		},
		exit: {
			ratio: .4,
			easing: cubicIn
		}
	};
	var FrameManager = class {
		constructor(ctx, animation, renderer) {
			this.store = /* @__PURE__ */ new Map();
			this.handles = /* @__PURE__ */ new Map();
			this.current = /* @__PURE__ */ new Set();
			this.previous = /* @__PURE__ */ new Set();
			this._uncommitted = false;
			this.animation = {
				...defaultAnimation,
				...animation
			};
			this.renderer = renderer ?? new SVGRenderer(ctx);
		}
		begin() {
			if (this._uncommitted) throw new Error("commit() required before begin()");
			this._uncommitted = true;
			this.previous = new Set(this.current);
			this.current.clear();
			this.renderer.beginFrame();
		}
		declare(id, state) {
			this.current.add(id);
			const existing = this.store.get(id);
			if (existing) {
				if (!("_tf" in state)) delete existing.desired._tf;
				if (!("_base" in state)) delete existing.desired._base;
				Object.assign(existing.desired, state);
				return existing;
			}
			const entity = {
				id,
				desired: { ...state },
				svg: null
			};
			this.store.set(id, entity);
			return entity;
		}
		patch(id, partial) {
			const entity = this.store.get(id);
			if (!entity) throw new Error(`Entity not found: ${id}`);
			Object.assign(entity.desired, partial);
		}
		/** Typed getter: narrows EntityState by its discriminant type field.
		*  Usage: fm.get('point:O', 'node')!.desired.x  — no cast needed. */
		get(id, _type) {
			return this.store.get(id);
		}
		commit(opts) {
			if (!this._uncommitted) throw new Error("begin() required before commit()");
			this._uncommitted = false;
			if (opts?.animate === false || typeof requestAnimationFrame === "undefined") {
				this._commitStatic();
				this.renderer.commitFrame({ animate: false });
				return;
			}
			const dur = opts?.ms ?? this.animation.duration;
			const enterTr = transition().duration(dur * this.animation.enter.ratio).ease(this.animation.enter.easing);
			const updateTr = transition().duration(dur * this.animation.update.ratio).ease(this.animation.update.easing);
			transition().duration(dur * this.animation.exit.ratio).ease(this.animation.exit.easing);
			for (const id of this.previous) if (!this.current.has(id)) {
				this.handles.get(id)?.remove();
				this.store.delete(id);
				this.handles.delete(id);
			}
			for (const id of this.current) if (!this.previous.has(id)) {
				const e = this.store.get(id);
				const h = this.renderer.create(id, e.desired);
				this.handles.set(id, h);
				e.svg = h.svg ?? null;
				const to = e.desired.opacity ?? 1;
				const svgEl = h.svg;
				if (svgEl) svgEl.attr("opacity", 0).transition(enterTr).attr("opacity", to);
			}
			for (const id of this.current) if (this.previous.has(id)) {
				const e = this.store.get(id);
				this.handles.get(id)?.update(e.desired, {
					animate: true,
					transition: updateTr
				});
			}
			for (const id of this.previous) if (!this.current.has(id)) {}
			this.renderer.commitFrame({
				animate: true,
				ms: dur
			});
		}
		_commitStatic() {
			for (const id of this.previous) if (!this.current.has(id)) {
				this.handles.get(id)?.remove();
				this.store.delete(id);
				this.handles.delete(id);
			}
			for (const id of this.current) {
				const e = this.store.get(id);
				if (!this.previous.has(id)) {
					const h = this.renderer.create(id, e.desired);
					this.handles.set(id, h);
					e.svg = h.svg ?? null;
				} else this.handles.get(id)?.update(e.desired);
			}
		}
		get entities() {
			return this.store;
		}
		get frameIds() {
			return this.current;
		}
	};

//#endregion
//#region vis/stage.ts
	const _stages = /* @__PURE__ */ new Map();
	let _observer = null;
	function stage(selector, opts = {}) {
		const { width = 780, height = 460, margin = 48, geom, theme = "warm", animation, renderer } = opts;
		const prev = _stages.get(selector);
		if (prev) prev[Symbol.dispose]();
		const ctx = bootstrap(selector, {
			width,
			height,
			margin,
			geom
		});
		const fm = new FrameManager(ctx, animation, renderer ?? new SVGRenderer(ctx));
		const _theme = resolveTheme(theme);
		const p = { ...ctx.palette };
		if (_theme.palette) {
			const tp = _theme.palette;
			for (const key of Object.keys(tp)) {
				const v = tp[key];
				if (v && v.fg) p[key] = {
					fg: v.fg,
					bg: v.bg || v.fg,
					a(pct) {
						const a = (pct / 100).toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
						return (v.fg.lastIndexOf(")") > 0 ? v.fg.slice(0, v.fg.lastIndexOf(")")) : v.fg) + " / " + a + ")";
					}
				};
			}
		}
		function steps(defs, opts) {
			const { start = 0 } = opts ?? {};
			const normalized = defs.map((d) => typeof d === "function" ? { frame: d } : d);
			let current = -1;
			let busy = false;
			const listeners = [];
			function go(i) {
				if (i === current || busy || i < 0 || i >= normalized.length) return;
				busy = true;
				try {
					fm.begin();
					normalized[i].frame(api);
					fm.commit();
					current = i;
				} finally {
					busy = false;
				}
				listeners.forEach((fn) => fn(i));
			}
			go(start);
			return {
				go,
				get current() {
					return current;
				},
				onChange(fn) {
					listeners.push(fn);
					return () => {
						const idx = listeners.indexOf(fn);
						if (idx >= 0) listeners.splice(idx, 1);
					};
				},
				destroy() {
					listeners.length = 0;
				}
			};
		}
		function frame(frameFn, opts) {
			return new Promise((resolve) => {
				fm.begin();
				frameFn(api);
				fm.commit({ ms: opts?.ms });
				setTimeout(resolve, opts?.ms ?? 500);
			});
		}
		async function play(fns, opts) {
			for (const fn of fns) await frame(fn, opts);
		}
		const api = {
			ctx,
			palette: p,
			stage: ctx.stage,
			root: ctx.root,
			steps,
			frame,
			play,
			frames: fm,
			theme: _theme,
			math: void 0,
			graph: void 0,
			layout: void 0,
			[Symbol.dispose]() {
				_stages.delete(selector);
				_observer?.disconnect();
				ctx.svg.remove();
				ctx.root.selectAll("*").remove();
			}
		};
		const container = typeof selector === "string" ? document.querySelector(selector) : selector;
		if (container && typeof MutationObserver !== "undefined") {
			_observer = new MutationObserver(() => {
				if (!document.contains(container)) api[Symbol.dispose]();
			});
			_observer.observe(document.body, {
				childList: true,
				subtree: true
			});
		}
		_stages.set(selector, api);
		api.math = createMathRenderer(fm, ctx, p);
		api.graph = createGraph(fm, ctx, p);
		api.layout = createLayout(fm, p);
		return api;
	}
	/** 3D stage (placeholder — requires three.js renderer) */
	function stage3D(selector, opts) {
		return stage(selector, {
			...opts,
			renderer: opts.renderer
		});
	}

//#endregion
//#region vis/index.ts
	if (typeof Symbol.dispose === "undefined") Symbol.dispose = Symbol("Symbol.dispose");
	if (typeof Symbol.asyncDispose === "undefined") Symbol.asyncDispose = Symbol("Symbol.asyncDispose");

//#endregion
exports.FrameManager = FrameManager;
exports.MARKER = MARKER;
exports.SVGRenderer = SVGRenderer;
exports.TOKENS = TOKENS;
exports.alpha = alpha;
exports.bootstrap = bootstrap;
exports.centerIn = centerIn;
exports.createCanvas = createCanvas;
exports.createLayout = createLayout;
exports.defineArrows = defineArrows;
exports.distribute = distribute;
exports.domLabel = domLabel;
exports.entryPt = entryPt;
exports.exitPt = exitPt;
exports.getBounds = getBounds;
exports.halo = halo;
exports.katexify = katexify;
exports.len = len;
exports.markerTip = markerTip;
exports.palette = palette;
exports.resolveTheme = resolveTheme;
exports.stage = stage;
exports.stage3D = stage3D;
exports.stepper = stepper;
exports.svgLabel = svgLabel;
exports.themes = themes;
return exports;
})({});