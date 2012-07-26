var deepmerge = require('deepmerge');

exports.merge = function (obj1, obj2) {
  return deepmerge(obj1, obj2);
};

exports.inherits = function(Child, Parent) {
    Child.__proto__ = Parent;
    Child.prototype.__proto__ = Parent.prototype;
};