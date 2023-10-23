function merge(target) {
  for (var i = 1; i < arguments.length; i++) {
    ko.utils.extend(target, arguments[i]);
  }
  return target;
}
ko.mapping.defaultOptions().ignore = ["constructor","toString"];

function Model() {
  ko.mapping.fromJS({id:null, errors:null}, Model.mapping, this);
}
Model.inherits = function(base) {
  this.prototype = Object.create(base.prototype);
  this.prototype.constructor = this;
  this.mapping = merge({}, base.mapping, this.mapping);
  this.array_mapping = merge({}, base.array_mapping, this.array_mapping);
  this.error_aliases = merge({}, base.error_aliases, this.error_aliases);
  this.all = base.all;
  this.search = base.search;
  this.get = base.get;
};
Model.mapping = {
  key: function(data) { return ko.unwrap(data.id); },
  errors: {
    create: function(options) { return ko.observable(options.data); },
    update: function(options) { return options.data; },
  },
};
Model.array_mapping = {};
Model.error_aliases = {};
Model.all = function() {
  var path = this.path, mapping = this.array_mapping;
  if (!path) throw (this.name||"Model")+".path is not set";
  if (!mapping) throw (this.name||"Model")+".array_mapping is not set";
  return json_api.get(path).then(function(arr){
    if (!arr instanceof Array) {
      return Promise.reject(arr);
    }
    return ko.mapping.fromJS(arr, mapping);
  });
};
Model.search = function(query) {
  var path = this.path, mapping = this.array_mapping;
  if (!path) throw (this.name||"Model")+".path is not set";
  if (!mapping) throw (this.name||"Model")+".array_mapping is not set";
  return json_api.get(path+"/search", query).then(function(arr){
    if (!arr instanceof Array) {
      return Promise.reject(arr);
    }
    return ko.mapping.fromJS(arr, mapping);
  });
};
Model.get = function(id) {
  var ctor = this, path = this.path;
  if (!id) throw "id must be specified";
  if (!path) throw (this.name||"Model")+".path is not set";
  return json_api.get(path+"/"+id).then(function(raw){
    return new ctor(raw);
  });
};
Model.comparator = function(a, b) { return a == b? 0: a == null? -1: b == null? 1: a.compareTo(b); };
Model.arrayFind = function(arr, model) {
  var id = ko.utils.unwrapObservable(model.id);
  for (var i = 0, j = arr.length; i < j; i++) {
    if (ko.utils.unwrapObservable(arr[i].id) == id) {
      return arr[i];
    }
  }
  return null;
};
Model.prototype.assign = function(raw) {
  var ctor = this.constructor, mapping = ctor.mapping;
  if (!mapping) throw (ctor.name||"Model")+".mapping is not set";
  return ko.mapping.fromJS(raw, mapping, this);
};
Model.prototype.__check_save = function(obj) {
  if (!obj.id && !obj.errors) {
    return Promise.reject(obj);
  }
  if (this.id() && this.id() != obj.id) {
    return Promise.reject(obj);
  }
  this.errors(null);
  if (obj.errors) {
    return Promise.reject(this.assign(obj));
  } else {
    return Promise.resolve(this.assign(obj));
  }
};
Model.prototype.save = function() {
  var ctor = this.constructor, path = ctor.path, mapping = ctor.mapping;
  if (!path) throw (ctor.name||"Model")+".path is not set";
  if (!mapping) throw (ctor.name||"Model")+".mapping is not set";
  var data = this.toParams();
  var method = json_api.post;
  if (this.id()) {
    path += "/"+this.id();
    method = json_api.put;
  }
  return method(path, data).then(this.__check_save.bind(this));
};
Model.prototype.destroy = function() {
  var ctor = this.constructor, path = ctor.path;
  if (!path) throw (ctor.name||"Model")+".path is not set";
  if (!this.id()) {
    return Promise.reject({status:404,error:"Not Found"});
  }
  return json_api.del(path+"/"+this.id()).then(function() {
    return this;
  }.bind(this));
};
Model.prototype.error_for = function(prop) {
  var ctor = this.constructor,
      aliases = ctor&&ctor.error_aliases&&ctor.error_aliases[prop],
      error = this["__error_for_"+prop];
  this["__error_for_"+prop] = error = error || ko.pureComputed(function() {
    var val = this.errors(), msgs = val && (val[prop+"_id"]||val[prop]);
    return msgs && localizedError(prop, msgs, aliases);
  }, this);
  return error;
};
Model.prototype.toObject = function(options) {
  options = ko.utils.extend({}, options);
  return ko.mapping.toJS(this, options);
};
Model.prototype.toParams = function(options) {
  options = ko.utils.extend({ignore:["id", "errors"]}, options);
  return ko.mapping.toJS(this, options);
};
Model.prototype.compareTo = function(o) { return this.id() - o.id(); };

function Category(raw) {
  Model.call(this, raw);
  raw = ko.utils.extend({side:null, name:null}, raw);
  ko.mapping.fromJS(raw, Category.mapping, this);
}
Category.path = "/categories";
Category.mapping = {
};
Category.array_mapping = {
  create: function(opts) { return new Category(opts.data); },
};
Category.error_aliases = {
};
Category.inherits = Model.inherits;
Category.inherits(Model);
Category.prototype.toString = function() {
  return "<分類: "+this.side()+","+this.name()+">";
};

function Kamoku(raw) {
  Model.call(this, raw);
  raw = ko.utils.extend({category_id:null, code:null, name:null}, raw);
  ko.mapping.fromJS(raw, Kamoku.mapping, this);
}
Kamoku.path = "/kamokus";
Kamoku.mapping = {
};
Kamoku.array_mapping = {
  create: function(opts) { return new Kamoku(opts.data); },
};
Kamoku.error_aliases = {
  "code":{"is not valid":"format digit"},
};
Kamoku.inherits = Model.inherits;
Kamoku.inherits(Model);
Kamoku.prototype.compareTo = function(o) {
  var d = this.category().compareTo(o.category());
  if (d != 0) return d;
  if (this.code() < o.code()) return -1;
  if (this.code() > o.code()) return 1;
  return 0;
}
Kamoku.prototype.toString = function() {
  return "<勘定科目: "+this.code()+":"+this.name()+">";
};

function Template(raw) {
  Model.call(this, raw);
  if (raw && raw.text && raw.text.charAt(0) === '[') {
    /* text is old format, convert to current format */
    raw.text = '{"items":'+raw.text+'}';
  }
  raw = ko.utils.extend({name:null, desc:null, text:'{"items":[]}'}, raw);
  ko.mapping.fromJS(raw, Template.mapping, this);
  this.json = ko.pureComputed(this.json, this);
}
Template.path = "/templates";
Template.mapping = {
};
Template.array_mapping = {
  create: function(opts) { return new Template(opts.data); },
};
Template.error_aliases = {
};
Template.inherits = Model.inherits;
Template.inherits(Model);
Template.normalize_json = function(json) {
  if (json instanceof Array) {
    /* for backword compatibility */
    json = {items: json};
  }
  if (!json.items) {
    json.items = [];
  }
  return json;
};
Template.prototype.json = {
  read: function() {try {return Template.normalize_json(JSON.parse(this.text()));} catch(e){return {items:[]};}},
  write: function(json) {return this.text(JSON.stringify(Template.normalize_json(json)));
  }
};
Template.prototype.compareTo = function(o) {
  if (this.name() < o.name()) return -1;
  if (this.name() > o.name()) return 1;
  return this.id() - o.id();
};
Template.prototype.toString = function() {
  return "<ひな型: "+this.name()+","+this.desc()+">";
};

function List(raw) {
  Model.call(this, raw);
  raw = ko.utils.extend({date:raw?null:date2str(new Date()), amount:null, is_initial:false, items: []}, raw);
  ko.mapping.fromJS(raw, List.mapping, this);
  this.repr = ko.pureComputed(this.repr, this);
  this.kasiItems = ko.pureComputed(this.kasiItems, this);
  this.kasiAmount = ko.pureComputed(this.kasiAmount, this);
  this.kariItems = ko.pureComputed(this.kariItems, this);
  this.kariAmount = ko.pureComputed(this.kariAmount, this);
}
List.path = "/lists";
List.mapping = {
  items: {
    create: function(opts) { return new Item(opts.data); },
  },
};
List.array_mapping = {
  create: function(opts) { return new List(opts.data); },
};
List.error_aliases = {
  "date":{"is not valid":"format date"},
};
List.inherits = Model.inherits;
List.inherits(Model);
List.prototype.repr = function() {
  return this.items().find(function(item, index) {return item.dir() == -1;});
};
List.prototype.kasiItems = function() {
  return this.items().filter(function(item, index) {return item.dir() == -1;});
};
List.prototype.kasiAmount = function() {
  var amount = 0;
  this.kasiItems().forEach(function(item, index) {amount += item.amount();});
  return amount;
};
List.prototype.kariItems = function() {
  return this.items().filter(function(item, index) {return item.dir() == 1;});
};
List.prototype.kariAmount = function() {
  var amount = 0;
  this.kariItems().forEach(function(item, index) {amount += item.amount();});
  return amount;
};
List.prototype.toString = function() {
  return "<仕訳: "+this.date()+", "+this.amount()+">";
};

function Item(raw) {
  Model.call(this, raw);
  raw = ko.utils.extend({list_id:null, kamoku_id:null, dir: null, desc: null, amount: null}, raw);
  ko.mapping.fromJS(raw, List.mapping, this);
  this.kasiAmount = ko.pureComputed(this.kasiAmount, this);
  this.kariAmount = ko.pureComputed(this.kariAmount, this);
  this.isEmpty = ko.pureComputed(this.isEmpty, this);
  this.isComplete = ko.pureComputed(this.isComplete, this);
}
Item.path = "/items";
Item.mapping = {
};
Item.array_mapping = {
  create: function(opts) { return new Item(opts.data); },
};
Item.error_aliases = {
};
Item.inherits = Model.inherits;
Item.inherits(Model);
Item.all = function() { throw "Item.all is not supported"; };
Item.get = function() { throw "Item.get is not supported"; };
Item.initial = function(query) {
  var ctor = this, path = this.path;
  return json_api.get(path+"/initial", query).then(function(raw){
    return new ctor(raw);
  });
};
Item.prototype.save = function() { throw "Item#save is not supported"; };
Item.prototype.kasiAmount = function() {
  return this.dir() == -1? this.amount(): 0;
};
Item.prototype.kariAmount = function() {
  return this.dir() == 1? this.amount(): 0;
};
Item.prototype.isEmpty = function() {
  return this.kamoku_id()==null && this.dir()==null && this.amount()==null;
};
Item.prototype.isComplete = function() {
  return this.kamoku_id()!=null && this.dir()!=null && this.amount()!=null;
};
Item.prototype.toString = function() {
  var dir = this.dir < 0? "貸方": "借方";
  return "<仕訳明細: "+dir+":"+
    this.kamoku_id()+", "+this.amount()+", "+this.desc()+">";
};

function Summary(raw) {
  ko.mapping.fromJS({
    kamoku_id:null,
    is_initial: false,
    initialAmount:null,
    kasiLeftAmount:null, kariLeftAmount:null,
    kasiRightAmount:null, kariRightAmount:null,
    kasiAmount:null, kariAmount:null
  }, Summary.mapping, this);
  this.finalAmount = ko.pureComputed(this.finalAmount, this);
}
Summary.path = "/summary";
Summary.mapping = {
};
Summary.array_mapping = {
  create: function(opts) { return new Summary(opts.data); },
};
Summary.error_aliases = {
};
Summary.inherits = Model.inherits;
Summary.inherits(Model);
Summary.get = function(date) {
  var ctor = this, path = this.path;
  return json_api.get(path+"/"+date);
};
Summary.prototype.finalAmount = function() {
  return this.initialAmount()+this.kariAmount()-this.kasiAmount();
};
Summary.prototype.toString = function() {
  return "<集計: "+this.kamoku_id()+":"+this.kasiAmount()+","+this.kariAmount()+">";
};

function ByKamoku(raw) {
  Model.call(this, raw);
  raw = ko.utils.extend({date_from:null, date_to:null, kamoku_id:null}, raw);
  ko.mapping.fromJS(raw, ByKamoku.mapping, this);
}
ByKamoku.inherits = Model.inherits;
ByKamoku.inherits(Model);

function DataStore() {
  var self = this;

  self.categoryMap = ko.observable(Object.create(null));
  self.categories = ko.observableArray();

  self.kamokuMap = ko.observable(Object.create(null));
  self.kamokuCodeMap = ko.observable(Object.create(null));
  self.kamokus = ko.observableArray();

  self.tmpls = ko.observableArray();
}
/* Category */
DataStore.prototype.pushCategory = function(cat, postponeSort) {
  var id = cat.id.peek(), map, cats;
  if (!id) return;
  map = this.categoryMap.peek();
  cats = this.categories;
  if (map[id]) {
    cats.remove(map[id]);
  }
  map[id] = cat;
  cats.push(cat);
  if (!cat.kamokus) {
    cat.kamokus = this.computedKamokusByCategroy(id);
  }
  if (!postponeSort) {
    cats.sort(Model.comparator);
  }
};
DataStore.prototype.removeCategory = function(cat) {
  var id = cat.id.peek(), map, cats;
  if (!id) return;
  map = this.categoryMap.peek();
  cats = this.categories;
  if (map[id] == cat) {
    cats.remove(map[id]);
    delete map[id];
  }
};
DataStore.prototype.setCategories = function(cats) {
  this.categoryMap(Object.create(null));
  this.categories.removeAll();
  cats.forEach(function(cat) { this.pushCategory(cat, true); }.bind(this));
  this.categories.sort(Model.comparator);
};
DataStore.prototype.computedCategory = function(category_id) {
  var cats = this.categories;
  var map = this.categoryMap;
  return ko.pureComputed({
    read: function() {
      var id = category_id();
      cats(); /* to associate */
      return id? map()[id]: null;
    },
    write: function(cat) {
      category_id(cat?cat.id():null);
    }
  });
};
DataStore.prototype.computedKamokusByCategroy = function(category_id) {
  return ko.computed(function() {
    return this.kamokus().filter(function(kamoku) {
      return kamoku.category_id() == category_id;
    });
  }.bind(this));
};
/* Kamoku */
DataStore.prototype.pushKamoku = function(kamoku, postponeSort) {
  var id = kamoku.id.peek(), code = kamoku.code.peek(), map, codeMap, kamokus;
  if (!id) return;
  map = this.kamokuMap.peek();
  codeMap = this.kamokuCodeMap.peek();
  kamokus = this.kamokus;
  if (map[id]) {
    kamokus.remove(map[id]);
    delete codeMap[map[id].code.peek()];
  }
  map[id] = kamoku;
  codeMap[code] = kamoku;
  kamokus.push(kamoku);
  if (!kamoku.category) {
    kamoku.category = this.computedCategory(kamoku.category_id);
  }
  if (!postponeSort) {
    kamokus.sort(Model.comparator);
  }
};
DataStore.prototype.removeKamoku = function(kamoku) {
  var id = kamoku.id.peek(), map, codeMap, kamokus;
  if (!id) return;
  map = this.kamokuMap.peek();
  codeMap = this.kamokuCodeMap.peek();
  kamokus = this.kamokus;
  if (map[id] == kamoku) {
    kamokus.remove(map[id]);
    delete codeMap[map[id].code.peek()];
    delete map[id];
  }
};
DataStore.prototype.setKamokus = function(kamokus) {
  this.kamokuMap(Object.create(null));
  this.kamokuCodeMap(Object.create(null));
  this.kamokus.removeAll();
  kamokus.forEach(function(kamoku) { this.pushKamoku(kamoku, true); }.bind(this));
  this.kamokus.sort(Model.comparator);
};
DataStore.prototype.computedKamoku = function(kamoku_id) {
  var kamokus = this.kamokus;
  var map = this.kamokuMap;
  return ko.pureComputed({
    read: function() {
      var id = kamoku_id();
      kamokus(); /* to associate */
      return id? map()[id]: null;
    },
    write: function(kamoku) {
      kamoku_id(kamoku?kamoku.id():null);
    }
  });
};
DataStore.prototype.computedKamokuCode = function(kamoku_id) {
  var kamoku_code = null;
  return ko.pureComputed({
    read: function() {
      var id = kamoku_id(),
          cats = this.kamokus();
      return id? kamokuMap[id].code(): kamoku_code;
    },
    write: function(code) {
      var kamoku = code && kamokuCodeMap[code];
      if (kamoku) {
        kamoku_code = null;
        kamoku_id(kamoku.id());
      } else {
        kamoku_code = code;
        kamoku_id(null);
      }
    }
  });
};
/* Template */
DataStore.prototype.pushTmpl = function(tmpl, postponeSort) {
  var id = tmpl.id.peek();
  if (!id) return;
  this.removeTmpl(tmpl);
  this.tmpls.push(tmpl);
  if (!postponeSort) {
    this.tmpls.sort(Model.comparator);
  }
};
DataStore.prototype.removeTmpl = function(tmpl) {
  var id = tmpl.id.peek();
  if (!id) return;
  this.tmpls.remove(function(tmpl2) { return tmpl2.id() == id; });
};
DataStore.prototype.setTmpls = function(tmpls) {
  this.tmpls(tmpls);
  this.tmpls.sort(Model.comparator);
};
