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
Kamoku.prototype.toString = function() {
  return "<勘定科目: "+this.code()+":"+this.name()+">";
};

function Template(raw) {
  Model.call(this, raw);
  raw = ko.utils.extend({name:null, desc:null, text:"[]"}, raw);
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
Template.prototype.json = {
  read: function() { try { return JSON.parse(this.text()); }catch(e){ return []; } },
  write: function(json) { return this.text(JSON.stringify(json)); }
};
Template.prototype.toString = function() {
  return "<ひな型: "+this.name()+","+this.desc()+">";
};

function List(raw) {
  Model.call(this, raw);
  raw = ko.utils.extend({date:raw?null:date2str(new Date()), amount:null, is_initial:false, items: []}, raw);
  ko.mapping.fromJS(raw, List.mapping, this);
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
