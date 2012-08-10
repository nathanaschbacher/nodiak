var deepmerge = require('deepmerge');

exports.merge = function (obj1, obj2) {
  return deepmerge(obj1, obj2);
};

exports.inherits = function(Child, Parent) {
    Child.__proto__ = Parent;
    Child.prototype.__proto__ = Parent.prototype;
};

exports.removeDuplicates = function(array) {
    var set = {};
    var reduced = [];

    for(var i = 0, length = array.length; i < length; i++) {
        set[array[i]] = true;
    }

    for(var key in set) {
        reduced.push(key);
    }

    return reduced;
};